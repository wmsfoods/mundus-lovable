CREATE OR REPLACE FUNCTION public.link_approved_user_request_by_email(p_email text)
 RETURNS TABLE(user_id uuid, company_id uuid, request_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(p_email,'')));
  v_uid uuid;
  v_meta jsonb;
  v_req record;
  v_target_company uuid;
  v_full_name text;
  v_role_text text;
  v_role_id uuid;
  v_is_supplier boolean;
  v_hq_office uuid;
BEGIN
  IF v_email = '' THEN RETURN; END IF;

  SELECT au.id, au.raw_user_meta_data INTO v_uid, v_meta
    FROM auth.users au
   WHERE lower(au.email) = v_email
   ORDER BY au.created_at DESC LIMIT 1;
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT * INTO v_req
    FROM public.user_requests ur
   WHERE lower(ur.email) = v_email
     AND ur.status = 'approved'
     AND (ur.created_user_id IS NULL OR ur.created_user_id = v_uid)
   ORDER BY ur.reviewed_at DESC NULLS LAST, ur.created_at DESC LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  v_target_company := v_req.approved_company_id;
  IF v_target_company IS NULL AND v_req.company_name IS NOT NULL THEN
    SELECT c.id INTO v_target_company
      FROM public.companies c
     WHERE lower(c.name) = lower(v_req.company_name)
       AND (v_req.registration_country IS NULL OR lower(coalesce(c.country,'')) = lower(v_req.registration_country))
     ORDER BY c.created_at DESC LIMIT 1;
    IF v_target_company IS NOT NULL THEN
      UPDATE public.user_requests SET approved_company_id = v_target_company WHERE id = v_req.id;
    END IF;
  END IF;
  IF v_target_company IS NULL THEN RETURN; END IF;

  v_full_name := COALESCE(NULLIF(v_meta->>'full_name',''), NULLIF(v_meta->>'name',''), v_req.name, split_part(v_email,'@',1));

  INSERT INTO public.users (id, email, name, company_id, active_company_id, user_type, is_owner, status)
  VALUES (v_uid, v_email, v_full_name, v_target_company, v_target_company, 'Master', true, 'active')
  ON CONFLICT (id) DO UPDATE
    SET name = COALESCE(NULLIF(public.users.name,''), EXCLUDED.name),
        email = COALESCE(public.users.email, EXCLUDED.email),
        active_company_id = COALESCE(public.users.active_company_id, EXCLUDED.active_company_id),
        user_type = COALESCE(public.users.user_type, EXCLUDED.user_type),
        is_owner = COALESCE(public.users.is_owner, EXCLUDED.is_owner),
        status = COALESCE(public.users.status, EXCLUDED.status);

  v_is_supplier := EXISTS (SELECT 1 FROM public.companies c WHERE c.id = v_target_company AND COALESCE(c.is_supplier,false) = true);
  v_role_text := CASE WHEN v_is_supplier THEN 'master_supplier' ELSE 'master_buyer' END;
  SELECT r.id INTO v_role_id FROM public.roles r WHERE r.name = v_role_text LIMIT 1;

  BEGIN
    INSERT INTO public.company_users (company_id, user_id, email, full_name, role, role_id, status, accepted_at, joined_at)
    VALUES (v_target_company, v_uid, v_email, v_full_name, v_role_text, v_role_id, 'active', now(), now())
    ON CONFLICT (company_id, user_id) DO UPDATE
      SET email = COALESCE(public.company_users.email, EXCLUDED.email),
          full_name = COALESCE(NULLIF(public.company_users.full_name,''), EXCLUDED.full_name),
          role = COALESCE(public.company_users.role, EXCLUDED.role),
          role_id = COALESCE(public.company_users.role_id, EXCLUDED.role_id),
          status = 'active',
          accepted_at = COALESCE(public.company_users.accepted_at, EXCLUDED.accepted_at),
          joined_at = COALESCE(public.company_users.joined_at, EXCLUDED.joined_at);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  SELECT c.id INTO v_hq_office
    FROM public.companies c
   WHERE (c.id = v_target_company OR c.parent_company_id = v_target_company)
     AND COALESCE(c.office_type,'headquarters') = 'headquarters'
   ORDER BY (c.id = v_target_company) DESC LIMIT 1;

  BEGIN
    INSERT INTO public.user_offices (user_id, company_id, role, is_primary)
    VALUES (v_uid, COALESCE(v_hq_office, v_target_company), 'office_admin', true)
    ON CONFLICT (user_id, company_id) DO UPDATE
      SET role = COALESCE(public.user_offices.role, EXCLUDED.role),
          is_primary = COALESCE(public.user_offices.is_primary, EXCLUDED.is_primary);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  UPDATE public.user_requests SET created_user_id = v_uid
   WHERE id = v_req.id AND created_user_id IS DISTINCT FROM v_uid;

  RETURN QUERY SELECT v_uid, v_target_company, v_req.id;
END;
$function$;