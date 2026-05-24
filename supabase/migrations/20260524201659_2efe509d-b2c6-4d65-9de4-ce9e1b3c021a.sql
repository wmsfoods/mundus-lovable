
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS est_number text;

ALTER TABLE public.company_users ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.company_users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.company_users ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.company_users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
