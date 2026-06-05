CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_cu record;
BEGIN
  SELECT * INTO v_cu FROM public.company_users
   WHERE invite_token = p_token AND accepted_at IS NULL
     AND (expires_at IS NULL OR expires_at > now())
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_token' USING ERRCODE='P0001';
  END IF;

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
    SET active_company_id = COALESCE(public.users.active_company_id, EXCLUDED.active_company_id),
        status = 'active',
        updated_at = now();

  UPDATE public.company_users
     SET user_id=p_user_id, status='active', accepted_at=now(),
         joined_at=COALESCE(joined_at, now())
   WHERE id = v_cu.id;

  RETURN jsonb_build_object('ok', true, 'company_id', v_cu.company_id);
END;
$function$;