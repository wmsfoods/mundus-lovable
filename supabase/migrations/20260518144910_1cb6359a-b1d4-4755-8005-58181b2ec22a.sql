DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  target_company_id uuid := '00000000-0000-beef-0000-000000000001';
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated', 'authenticated',
    'felipe.bastos3357@gmail.com',
    crypt('Mundus@2026', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Felipe Bastos"}'::jsonb,
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', 'felipe.bastos3357@gmail.com', 'email_verified', true),
    'email', new_user_id::text,
    now(), now(), now()
  );

  INSERT INTO public.users (id, email, name, company_id, active_company_id, status)
  VALUES (new_user_id, 'felipe.bastos3357@gmail.com', 'Felipe Bastos', target_company_id, target_company_id, 'active');
END $$;