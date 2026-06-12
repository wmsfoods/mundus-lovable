DO $$
DECLARE
  v_email text := 'fnascimento4@icloud.com';
  v_user_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO v_user_ids
  FROM auth.users
  WHERE lower(email) = lower(v_email)
     OR id IN (SELECT id FROM public.users WHERE lower(email) = lower(v_email));

  IF v_user_ids IS NOT NULL THEN
    UPDATE public.user_requests SET approval_user_id = NULL WHERE approval_user_id = ANY(v_user_ids);
    UPDATE public.user_requests SET invited_by_user_id = NULL WHERE invited_by_user_id = ANY(v_user_ids);
    DELETE FROM public.user_requests WHERE created_user_id = ANY(v_user_ids);
    DELETE FROM public.notifications WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.app_notifications WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.device_push_tokens WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.notification_preferences WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.offer_favorites WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.offer_likes WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.offer_shares WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.user_offices WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.company_users WHERE user_id = ANY(v_user_ids) OR lower(email) = lower(v_email);
    DELETE FROM public.users WHERE id = ANY(v_user_ids) OR lower(email) = lower(v_email);
    DELETE FROM auth.identities WHERE user_id = ANY(v_user_ids);
    DELETE FROM auth.users WHERE id = ANY(v_user_ids) OR lower(email) = lower(v_email);
  ELSE
    DELETE FROM public.company_users WHERE lower(email) = lower(v_email);
    DELETE FROM public.users WHERE lower(email) = lower(v_email);
    DELETE FROM auth.users WHERE lower(email) = lower(v_email);
  END IF;
END $$;