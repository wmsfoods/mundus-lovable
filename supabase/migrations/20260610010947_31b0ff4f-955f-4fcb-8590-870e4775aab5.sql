
-- 1) Validation trigger on user_requests INSERT: enforce role/company_name/registration_country
CREATE OR REPLACE FUNCTION public.tg_user_requests_validate_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS NULL OR NEW.role NOT IN ('buyer','supplier') THEN
    RAISE EXCEPTION 'user_requests.role must be buyer or supplier (got: %)', NEW.role
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.company_name IS NULL OR length(btrim(NEW.company_name)) = 0 THEN
    RAISE EXCEPTION 'user_requests.company_name is required'
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.registration_country IS NULL OR length(btrim(NEW.registration_country)) = 0 THEN
    RAISE EXCEPTION 'user_requests.registration_country is required'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_user_request_insert ON public.user_requests;
CREATE TRIGGER validate_user_request_insert
BEFORE INSERT ON public.user_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_user_requests_validate_insert();

-- 2) RPC: approve_user_request — atomic company resolution + status update
CREATE OR REPLACE FUNCTION public.approve_user_request(p_request_id uuid)
RETURNS TABLE(request_id uuid, company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.user_requests%ROWTYPE;
  v_company_id uuid;
  v_is_buyer boolean;
  v_is_supplier boolean;
BEGIN
  IF NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_req FROM public.user_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_request not found';
  END IF;

  IF v_req.role IS NULL OR v_req.role NOT IN ('buyer','supplier') THEN
    RAISE EXCEPTION 'cannot approve: request has invalid role (%). Ask user to re-register.', v_req.role;
  END IF;
  IF v_req.company_name IS NULL OR length(btrim(v_req.company_name)) = 0 THEN
    RAISE EXCEPTION 'cannot approve: company_name is missing. Ask user to re-register.';
  END IF;

  v_is_buyer := v_req.role = 'buyer';
  v_is_supplier := v_req.role = 'supplier';

  -- Reuse user's existing company if already linked
  SELECT u.company_id INTO v_company_id
    FROM public.users u WHERE lower(u.email) = lower(v_req.email) LIMIT 1;

  -- Or match an existing company by name+country
  IF v_company_id IS NULL THEN
    SELECT c.id INTO v_company_id
      FROM public.companies c
     WHERE lower(c.name) = lower(v_req.company_name)
       AND lower(coalesce(c.country,'')) = lower(coalesce(v_req.registration_country, v_req.country, ''))
     ORDER BY c.created_at DESC LIMIT 1;
  END IF;

  -- Or create a fresh company
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (
      name, tax_id, country, state, address, city, zip_code, phone,
      is_buyer, is_supplier, office_type, status,
      protein_profiles, buyer_protein_profile, countries_of_operation
    ) VALUES (
      v_req.company_name,
      coalesce(v_req.tax_id, ''),
      coalesce(v_req.registration_country, v_req.country, ''),
      coalesce(v_req.state, ''),
      coalesce(v_req.address, ''),
      v_req.city,
      v_req.zip,
      coalesce(v_req.phone, ''),
      v_is_buyer,
      v_is_supplier,
      'headquarters',
      'active',
      coalesce(v_req.proteins, '{}'),
      CASE WHEN v_is_buyer THEN coalesce(v_req.proteins,'{}') ELSE '{}' END,
      coalesce(v_req.countries_of_operation,'{}')
    )
    RETURNING id INTO v_company_id;
  ELSE
    -- Ensure role flags reflect the approval
    UPDATE public.companies
       SET is_buyer = is_buyer OR v_is_buyer,
           is_supplier = is_supplier OR v_is_supplier
     WHERE id = v_company_id;
  END IF;

  UPDATE public.user_requests
     SET status = 'approved',
         reviewed_at = now(),
         approval_user_id = auth.uid(),
         approved_company_id = v_company_id
   WHERE id = p_request_id;

  -- Trigger fires link_approved_user_request_by_email automatically;
  -- also call directly as a safety net in case auth user exists.
  BEGIN
    PERFORM public.link_approved_user_request_by_email(v_req.email);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN QUERY SELECT p_request_id, v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_user_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_user_request(uuid) TO authenticated;

-- 3) RPC: reject_user_request
CREATE OR REPLACE FUNCTION public.reject_user_request(p_request_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.user_requests
     SET status = 'rejected',
         reviewed_at = now(),
         approval_user_id = auth.uid(),
         reject_reason = p_reason
   WHERE id = p_request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reject_user_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_user_request(uuid, text) TO authenticated;
