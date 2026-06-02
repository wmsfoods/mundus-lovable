
CREATE OR REPLACE FUNCTION public.tg_link_approved_user_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
  v_hq_office uuid;
  v_full_name text;
BEGIN
  -- Find an approved user_request for this email that hasn't been linked yet.
  SELECT * INTO v_req
    FROM public.user_requests
   WHERE lower(email) = lower(NEW.email)
     AND status = 'approved'
     AND created_user_id IS NULL
   ORDER BY reviewed_at DESC NULLS LAST, created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_req.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_full_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name',''),
    NULLIF(NEW.raw_user_meta_data->>'name',''),
    v_req.name,
    split_part(NEW.email,'@',1)
  );

  -- Upsert into public.users
  INSERT INTO public.users (id, email, name, company_id, active_company_id,
                            user_type, is_owner, status)
  VALUES (NEW.id, NEW.email, v_full_name, v_req.company_id, v_req.company_id,
          'Master', true, 'active')
  ON CONFLICT (id) DO UPDATE
    SET company_id = COALESCE(public.users.company_id, EXCLUDED.company_id),
        active_company_id = COALESCE(public.users.active_company_id, EXCLUDED.active_company_id),
        status = COALESCE(public.users.status, 'active');

  -- Find HQ office for that company (best effort)
  SELECT id INTO v_hq_office
    FROM public.companies
   WHERE (id = v_req.company_id OR parent_company_id = v_req.company_id)
     AND COALESCE(office_type,'headquarters') = 'headquarters'
   ORDER BY (id = v_req.company_id) DESC
   LIMIT 1;

  IF v_hq_office IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_offices (user_id, company_id, office_id)
      VALUES (NEW.id, v_req.company_id, v_hq_office)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- Mark request linked
  UPDATE public.user_requests
     SET created_user_id = NEW.id
   WHERE id = v_req.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block signup
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_approved_user_request ON auth.users;
CREATE TRIGGER link_approved_user_request
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.tg_link_approved_user_request();
