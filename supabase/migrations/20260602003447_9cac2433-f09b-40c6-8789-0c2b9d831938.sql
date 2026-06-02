CREATE OR REPLACE FUNCTION public.public_capture_lead(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(p_payload->>'email','')));
  v_name text := nullif(trim(coalesce(p_payload->>'name','')),'');
  v_company text := nullif(trim(coalesce(p_payload->>'company','')),'');
  v_phone text := nullif(trim(coalesce(p_payload->>'phone','')),'');
  v_country text := nullif(trim(coalesce(p_payload->>'country','')),'');
  v_protein text := nullif(trim(coalesce(p_payload->>'protein','')),'');
  v_lead_type text := nullif(trim(coalesce(p_payload->>'lead_type','')),'');
  v_rep text := nullif(trim(coalesce(p_payload->>'mundus_rep','')),'');
  v_lang text := nullif(trim(coalesce(p_payload->>'lang','')),'');
  v_proteins text[];
  v_recent int;
  v_company_id uuid;
  v_contact_id uuid;
BEGIN
  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE='22023';
  END IF;
  IF v_lead_type IS NOT NULL AND v_lead_type NOT IN ('buyer','supplier','buyer_supplier') THEN
    RAISE EXCEPTION 'invalid_lead_type' USING ERRCODE='22023';
  END IF;

  -- Accept either `proteins` (text[] / jsonb array) or legacy `protein` (single string)
  IF jsonb_typeof(p_payload->'proteins') = 'array' THEN
    SELECT array_agg(DISTINCT lower(trim(x)))
      INTO v_proteins
      FROM jsonb_array_elements_text(p_payload->'proteins') AS x
     WHERE nullif(trim(x),'') IS NOT NULL;
  ELSIF v_protein IS NOT NULL THEN
    v_proteins := ARRAY[lower(v_protein)];
  END IF;

  -- Rate limit: max 5 captures per email in the last 10 minutes
  SELECT count(*) INTO v_recent FROM public_lead_sessions
    WHERE lower(email) = v_email AND created_at > now() - interval '10 minutes';
  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE='P0003';
  END IF;

  -- Upsert crm company (best-effort match by name; otherwise create)
  IF v_company IS NOT NULL THEN
    SELECT id INTO v_company_id FROM crm_companies
      WHERE lower(name) = lower(v_company) AND COALESCE(is_active,true)
      ORDER BY created_at LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    INSERT INTO crm_companies (name, country, source, source_detail, company_type, stage, lead_type)
    VALUES (
      COALESCE(v_company, split_part(v_email,'@',2)),
      v_country, 'inbound', 'public_home_chat', 'prospect', 'cold', v_lead_type
    ) RETURNING id INTO v_company_id;
  ELSE
    UPDATE crm_companies
      SET lead_type = COALESCE(lead_type, v_lead_type),
          country = COALESCE(country, v_country)
    WHERE id = v_company_id;
  END IF;

  -- Upsert contact by lowercased email
  SELECT id INTO v_contact_id FROM crm_contacts WHERE lower(email) = v_email LIMIT 1;
  IF v_contact_id IS NULL THEN
    INSERT INTO crm_contacts (
      company_id, email, full_name, phone, country,
      preferred_language, products_of_interest, lead_source, mundus_rep
    ) VALUES (
      v_company_id, v_email, COALESCE(v_name, v_email), v_phone, v_country,
      COALESCE(v_lang,'en'),
      v_proteins,
      'public_home_chat', v_rep
    ) RETURNING id INTO v_contact_id;
  ELSE
    UPDATE crm_contacts SET
      full_name = COALESCE(full_name, v_name),
      phone = COALESCE(phone, v_phone),
      country = COALESCE(country, v_country),
      preferred_language = COALESCE(preferred_language, v_lang),
      products_of_interest = COALESCE(v_proteins, products_of_interest),
      mundus_rep = COALESCE(mundus_rep, v_rep),
      company_id = COALESCE(company_id, v_company_id)
    WHERE id = v_contact_id;
  END IF;

  INSERT INTO public_lead_sessions (email, payload, ip, user_agent)
  VALUES (
    v_email, p_payload,
    nullif(p_payload->>'_ip',''), nullif(p_payload->>'_ua','')
  );

  RETURN jsonb_build_object(
    'success', true,
    'contact_id', v_contact_id,
    'company_id', v_company_id
  );
END;
$function$;