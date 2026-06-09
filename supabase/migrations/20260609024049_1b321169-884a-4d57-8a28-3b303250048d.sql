CREATE OR REPLACE FUNCTION public.dedup_check_invite(p_email text, p_tax_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(p_email,'')));
  v_tax text := lower(trim(coalesce(p_tax_id,'')));
  v_user_exists boolean;
  v_is_supplier boolean;
  v_pending_expires_at timestamptz;
  v_tax_company_exists boolean;
BEGIN
  IF v_email = '' THEN
    RETURN jsonb_build_object('case', 'invalid_input');
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.users u
      JOIN public.companies c ON c.id = u.company_id
     WHERE lower(u.email) = v_email
       AND u.deleted_at IS NULL
       AND coalesce(c.is_supplier, false) = true
  ) INTO v_is_supplier;
  IF v_is_supplier THEN
    RETURN jsonb_build_object('case', 'email_is_supplier', 'echo_email', p_email);
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.users u WHERE lower(u.email) = v_email AND u.deleted_at IS NULL)
    INTO v_user_exists;
  IF v_user_exists THEN
    RETURN jsonb_build_object('case', 'existing_user', 'echo_email', p_email);
  END IF;

  SELECT (ur.created_at + interval '30 days')
    INTO v_pending_expires_at
    FROM public.user_requests ur
   WHERE lower(ur.email) = v_email AND ur.status = 'pending'
   ORDER BY ur.created_at DESC LIMIT 1;
  IF v_pending_expires_at IS NOT NULL THEN
    RETURN jsonb_build_object('case', 'pending_invite', 'echo_email', p_email, 'expires_at', v_pending_expires_at);
  END IF;

  IF v_tax <> '' THEN
    SELECT EXISTS (SELECT 1 FROM public.companies c WHERE lower(coalesce(c.tax_id,'')) = v_tax AND coalesce(c.is_buyer,false) = true)
      INTO v_tax_company_exists;
    IF v_tax_company_exists THEN
      RETURN jsonb_build_object('case', 'existing_company_new_contact', 'echo_email', p_email, 'echo_tax_id', p_tax_id);
    END IF;
  END IF;

  RETURN jsonb_build_object('case', 'new_buyer');
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_supplier_invite(p_supplier_office_id uuid, p_email text, p_company_name text DEFAULT NULL::text, p_contact_name text DEFAULT NULL::text, p_tax_id text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_private_label text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(coalesce(p_email,'')));
  v_tax text := lower(trim(coalesce(p_tax_id,'')));
  v_existing_user_company_id uuid;
  v_is_supplier boolean;
  v_existing_link record;
  v_can_reinvite jsonb;
  v_user_request_id uuid;
  v_existing_tax_company_id uuid;
  v_pending_request_id uuid;
  v_new_link_id uuid;
  v_sentinel_company_id uuid := '00000000-0000-beef-0000-000000000001';
BEGIN
  IF NOT (p_supplier_office_id IN (SELECT * FROM public.current_user_company_ids())) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authorized');
  END IF;

  IF v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_email');
  END IF;

  -- Hard block: email belongs to a Supplier user → cannot be invited as buyer.
  SELECT EXISTS (
    SELECT 1
      FROM public.users u
      JOIN public.companies c ON c.id = u.company_id
     WHERE lower(u.email) = v_email
       AND u.deleted_at IS NULL
       AND coalesce(c.is_supplier, false) = true
  ) INTO v_is_supplier;
  IF v_is_supplier THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_is_supplier');
  END IF;

  SELECT u.company_id INTO v_existing_user_company_id
    FROM public.users u
   WHERE lower(u.email) = v_email AND u.deleted_at IS NULL
   LIMIT 1;

  IF v_existing_user_company_id IS NOT NULL THEN
    SELECT * INTO v_existing_link
      FROM public.supplier_customer_links
     WHERE supplier_office_id = p_supplier_office_id
       AND buyer_company_id = v_existing_user_company_id;

    IF FOUND THEN
      v_can_reinvite := public.can_reinvite_buyer(p_supplier_office_id, v_existing_user_company_id);
      IF (v_can_reinvite->>'can')::bool = false THEN
        RETURN jsonb_build_object('ok', false, 'reason', v_can_reinvite->>'reason', 'detail', v_can_reinvite);
      END IF;
      UPDATE public.supplier_customer_links
         SET status = 'invited',
             invited_by_user_id = v_user_id,
             invited_at = now(),
             responded_at = NULL,
             reinvite_count = reinvite_count + 1,
             private_label = COALESCE(p_private_label, private_label),
             notes = COALESCE(p_notes, notes)
       WHERE id = v_existing_link.id;
      RETURN jsonb_build_object('ok', true, 'link_id', v_existing_link.id, 'flow', 'reinvited_existing_buyer');
    END IF;

    INSERT INTO public.supplier_customer_links (supplier_office_id, buyer_company_id, status, invited_by_user_id, private_label, notes)
    VALUES (p_supplier_office_id, v_existing_user_company_id, 'invited', v_user_id, p_private_label, p_notes)
    RETURNING id INTO v_new_link_id;
    RETURN jsonb_build_object('ok', true, 'link_id', v_new_link_id, 'flow', 'invited_existing_buyer');
  END IF;

  SELECT id INTO v_pending_request_id
    FROM public.user_requests
   WHERE lower(email) = v_email AND status = 'pending'
   ORDER BY created_at DESC LIMIT 1;

  IF v_pending_request_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'pending_invite_elsewhere');
  END IF;

  IF v_tax <> '' THEN
    SELECT id INTO v_existing_tax_company_id
      FROM public.companies
     WHERE lower(coalesce(tax_id,'')) = v_tax AND coalesce(is_buyer,false) = true
     LIMIT 1;
  END IF;

  IF v_existing_tax_company_id IS NOT NULL THEN
    SELECT * INTO v_existing_link
      FROM public.supplier_customer_links
     WHERE supplier_office_id = p_supplier_office_id
       AND buyer_company_id = v_existing_tax_company_id;

    INSERT INTO public.user_requests (
      company_id, name, email, status, company_name, role, tax_id, phone, country,
      invited_by_office_id, invited_by_user_id, approved_company_id
    )
    VALUES (
      v_sentinel_company_id, coalesce(p_contact_name, p_email), v_email, 'pending',
      coalesce(p_company_name, ''), 'buyer', nullif(v_tax, ''), p_phone, p_country,
      p_supplier_office_id, v_user_id, v_existing_tax_company_id
    )
    RETURNING id INTO v_user_request_id;

    IF FOUND AND v_existing_link.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok', true,
        'user_request_id', v_user_request_id,
        'flow', 'new_contact_existing_link'
      );
    END IF;

    INSERT INTO public.supplier_customer_links (
      supplier_office_id, user_request_id, status, invited_by_user_id, private_label, notes
    )
    VALUES (
      p_supplier_office_id, v_user_request_id, 'pending_signup', v_user_id, p_private_label, p_notes
    )
    RETURNING id INTO v_new_link_id;

    RETURN jsonb_build_object(
      'ok', true,
      'link_id', v_new_link_id,
      'user_request_id', v_user_request_id,
      'flow', 'invited_new_contact_existing_company'
    );
  END IF;

  INSERT INTO public.user_requests (
    company_id, name, email, status, company_name, role, tax_id, phone, country,
    invited_by_office_id, invited_by_user_id
  )
  VALUES (
    v_sentinel_company_id, coalesce(p_contact_name, p_email), v_email, 'pending',
    coalesce(p_company_name, ''), 'buyer', nullif(v_tax, ''), p_phone, p_country,
    p_supplier_office_id, v_user_id
  )
  RETURNING id INTO v_user_request_id;

  INSERT INTO public.supplier_customer_links (
    supplier_office_id, user_request_id, status, invited_by_user_id, private_label, notes
  )
  VALUES (
    p_supplier_office_id, v_user_request_id, 'pending_signup', v_user_id, p_private_label, p_notes
  )
  RETURNING id INTO v_new_link_id;

  RETURN jsonb_build_object(
    'ok', true,
    'link_id', v_new_link_id,
    'user_request_id', v_user_request_id,
    'flow', 'invited_new_buyer'
  );
END;
$function$;