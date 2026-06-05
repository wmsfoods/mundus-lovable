DROP INDEX IF EXISTS public.company_users_company_id_email_key;
DROP INDEX IF EXISTS public.company_users_company_email_key;
DROP INDEX IF EXISTS public.ux_company_users_company_email;
ALTER TABLE public.company_users ADD CONSTRAINT company_users_company_id_email_key UNIQUE (company_id, email);