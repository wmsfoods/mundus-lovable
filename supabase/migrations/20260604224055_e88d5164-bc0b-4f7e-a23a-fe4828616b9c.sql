CREATE UNIQUE INDEX IF NOT EXISTS company_users_company_id_email_key
  ON public.company_users (company_id, email)
  WHERE email IS NOT NULL;