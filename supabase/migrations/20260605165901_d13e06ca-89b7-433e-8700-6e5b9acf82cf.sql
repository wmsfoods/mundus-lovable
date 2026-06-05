CREATE OR REPLACE FUNCTION public.claim_pending_invites()
RETURNS TABLE(claimed_count integer, first_company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_first uuid;
  v_count integer := 0;
  v_linked record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT 0, NULL::uuid;
    RETURN;
  END IF;

  SELECT lower(email),
         COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email,'@',1))
    INTO v_email, v_name
    FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RETURN QUERY SELECT 0, NULL::uuid;
    RETURN;
  END IF;

  WITH updated AS (
    UPDATE public.company_users
       SET user_id     = v_uid,
           status      = CASE WHEN status IN ('invited','pending') THEN 'active' ELSE status END,
           accepted_at = COALESCE(accepted_at, now()),
           joined_at   = COALESCE(joined_at, now()),
           updated_at  = now()
     WHERE user_id IS NULL
       AND lower(email) = v_email
    RETURNING company_id, full_name
  )
  SELECT count(*)::int, min(company_id), min(full_name)
    INTO v_count, v_first, v_name
    FROM updated;

  IF v_count > 0 AND v_first IS NOT NULL THEN
    INSERT INTO public.users (id, company_id, name, email, status, active_company_id, created_at, updated_at)
    VALUES (v_uid, v_first, COALESCE(v_name, split_part(v_email,'@',1)), v_email, 'active', v_first, now(), now())
    ON CONFLICT (id) DO UPDATE
      SET company_id        = COALESCE(public.users.company_id, EXCLUDED.company_id),
          active_company_id = COALESCE(public.users.active_company_id, EXCLUDED.active_company_id),
          status            = 'active',
          updated_at        = now();
  END IF;

  BEGIN
    SELECT * INTO v_linked
      FROM public.link_approved_user_request_by_email(v_email)
     LIMIT 1;
    IF v_linked.company_id IS NOT NULL THEN
      v_count := v_count + 1;
      v_first := COALESCE(v_first, v_linked.company_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN QUERY SELECT v_count, v_first;
END;
$function$;