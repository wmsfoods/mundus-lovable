
CREATE OR REPLACE FUNCTION public.tg_link_approved_user_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
  v_full_name text;
BEGIN
  SELECT * INTO v_req
    FROM public.user_requests
   WHERE lower(email) = lower(NEW.email)
     AND status = 'approved'
     AND created_user_id IS NULL
   ORDER BY reviewed_at DESC NULLS LAST, created_at DESC
   LIMIT 1;

  IF NOT FOUND OR v_req.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name',''),
    NULLIF(NEW.raw_user_meta_data->>'name',''),
    v_req.name,
    split_part(NEW.email,'@',1)
  );

  INSERT INTO public.users (id, email, name, company_id, active_company_id,
                            user_type, is_owner, status)
  VALUES (NEW.id, NEW.email, v_full_name, v_req.company_id, v_req.company_id,
          'Master', true, 'active')
  ON CONFLICT (id) DO UPDATE
    SET company_id = COALESCE(public.users.company_id, EXCLUDED.company_id),
        active_company_id = COALESCE(public.users.active_company_id, EXCLUDED.active_company_id),
        status = COALESCE(public.users.status, 'active');

  BEGIN
    INSERT INTO public.user_offices (user_id, company_id, is_primary)
    VALUES (NEW.id, v_req.company_id, true)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  UPDATE public.user_requests
     SET created_user_id = NEW.id
   WHERE id = v_req.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
