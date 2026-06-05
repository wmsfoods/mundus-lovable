-- Cleanup invited user fnascimento4@icloud.com so the flow can be re-tested
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'fnascimento4@icloud.com';
  DELETE FROM public.company_users WHERE email = 'fnascimento4@icloud.com';
  DELETE FROM public.users WHERE email = 'fnascimento4@icloud.com';
  IF v_uid IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_uid;
  END IF;
END $$;