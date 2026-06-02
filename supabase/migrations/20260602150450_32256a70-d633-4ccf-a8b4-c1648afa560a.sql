CREATE OR REPLACE FUNCTION public.public_lookup_contact(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text := lower(trim(coalesce(p_email,'')));
  v_contact_id uuid;
  v_company_id uuid;
  v_has_account boolean := false;
  v_name text;
BEGIN
  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('found', false, 'has_mundus_account', false);
  END IF;

  SELECT id, company_id, COALESCE(NULLIF(trim(first_name),''), NULLIF(trim(full_name),''))
    INTO v_contact_id, v_company_id, v_name
    FROM crm_contacts WHERE lower(email) = v_email LIMIT 1;

  SELECT EXISTS (SELECT 1 FROM users WHERE lower(email) = v_email)
    INTO v_has_account;

  IF v_name IS NULL THEN
    SELECT NULLIF(trim(name),'') INTO v_name FROM users WHERE lower(email) = v_email LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'found', v_contact_id IS NOT NULL,
    'has_mundus_account', v_has_account,
    'contact_id', v_contact_id,
    'company_id', v_company_id,
    'contact_name', v_name
  );
END;
$function$;