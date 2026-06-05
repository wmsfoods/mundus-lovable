CREATE OR REPLACE FUNCTION public.tg_users_prevent_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_mundus_admin() OR current_setting('app.allow_user_company_sync', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'cannot_change_company_id' USING ERRCODE = '42501';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'cannot_change_user_id' USING ERRCODE = '42501';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email AND NEW.id <> auth.uid() THEN
    RAISE EXCEPTION 'cannot_change_other_user_email' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_user_company_access(p_user_id uuid, p_changed_company_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_next_company_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT cu.company_id
    INTO v_next_company_id
    FROM public.company_users cu
   WHERE cu.user_id = p_user_id
     AND cu.status = 'active'
   ORDER BY (cu.company_id = p_changed_company_id) DESC,
            cu.updated_at DESC NULLS LAST,
            cu.created_at DESC NULLS LAST
   LIMIT 1;

  PERFORM set_config('app.allow_user_company_sync', 'on', true);

  IF v_next_company_id IS NOT NULL THEN
    UPDATE public.users
       SET active_company_id = v_next_company_id,
           status = 'active',
           updated_at = now()
     WHERE id = p_user_id;
  ELSE
    UPDATE public.users
       SET active_company_id = NULL,
           status = 'inactive',
           updated_at = now()
     WHERE id = p_user_id
       AND EXISTS (
         SELECT 1
           FROM public.company_users cu
          WHERE cu.user_id = p_user_id
       );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_company_user_membership_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NOT NULL THEN
      PERFORM public.refresh_user_company_access(NEW.user_id, NEW.company_id);
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.user_id IS DISTINCT FROM NEW.user_id
     OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    IF OLD.user_id IS NOT NULL THEN
      PERFORM public.refresh_user_company_access(OLD.user_id, OLD.company_id);
    END IF;
    IF NEW.user_id IS NOT NULL THEN
      PERFORM public.refresh_user_company_access(NEW.user_id, NEW.company_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS company_users_membership_access_sync ON public.company_users;
CREATE TRIGGER company_users_membership_access_sync
AFTER INSERT OR UPDATE OF user_id, status, company_id ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_user_membership_access();

CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_cu record;
BEGIN
  SELECT * INTO v_cu FROM public.company_users
   WHERE invite_token = p_token
     AND status IN ('invited', 'pending')
     AND accepted_at IS NULL
     AND (expires_at IS NULL OR expires_at > now())
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_token' USING ERRCODE='P0001';
  END IF;

  PERFORM set_config('app.allow_user_company_sync', 'on', true);

  INSERT INTO public.users (id, company_id, name, email, status, preferred_language, active_company_id, created_at, updated_at)
  VALUES (
    p_user_id,
    v_cu.company_id,
    COALESCE(v_cu.full_name, split_part(v_cu.email, '@', 1)),
    lower(v_cu.email),
    'active',
    COALESCE(v_cu.language, 'en'),
    v_cu.company_id,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET active_company_id = EXCLUDED.active_company_id,
        status = 'active',
        updated_at = now();

  UPDATE public.company_users
     SET user_id = p_user_id,
         status = 'active',
         accepted_at = now(),
         joined_at = COALESCE(joined_at, now()),
         updated_at = now()
   WHERE id = v_cu.id;

  RETURN jsonb_build_object('ok', true, 'company_id', v_cu.company_id);
END;
$function$;

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
       SET user_id = v_uid,
           updated_at = now()
     WHERE user_id IS NULL
       AND lower(email) = v_email
       AND status = 'active'
       AND accepted_at IS NOT NULL
    RETURNING company_id, full_name
  )
  SELECT count(*)::int, min(company_id), min(full_name)
    INTO v_count, v_first, v_name
    FROM updated;

  IF v_count > 0 AND v_first IS NOT NULL THEN
    PERFORM set_config('app.allow_user_company_sync', 'on', true);
    INSERT INTO public.users (id, company_id, name, email, status, active_company_id, created_at, updated_at)
    VALUES (v_uid, v_first, COALESCE(v_name, split_part(v_email,'@',1)), v_email, 'active', v_first, now(), now())
    ON CONFLICT (id) DO UPDATE
      SET active_company_id = EXCLUDED.active_company_id,
          status = 'active',
          updated_at = now();
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

GRANT EXECUTE ON FUNCTION public.refresh_user_company_access(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_pending_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_team_invitation(uuid, uuid) TO authenticated, service_role;

UPDATE public.company_users
   SET user_id = NULL,
       accepted_at = NULL,
       joined_at = NULL,
       updated_at = now()
 WHERE status IN ('invited', 'pending')
   AND (user_id IS NOT NULL OR accepted_at IS NOT NULL OR joined_at IS NOT NULL);

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.company_users WHERE user_id IS NOT NULL LOOP
    PERFORM public.refresh_user_company_access(r.user_id, NULL);
  END LOOP;
END $$;