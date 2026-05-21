
-- Extend company_users for team management (Module 2)
ALTER TABLE public.company_users
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Drop legacy NOT NULL on user_id (we don't have auth users yet for invited members)
ALTER TABLE public.company_users ALTER COLUMN user_id DROP NOT NULL;

-- Role check
ALTER TABLE public.company_users DROP CONSTRAINT IF EXISTS company_users_role_check;
ALTER TABLE public.company_users
  ADD CONSTRAINT company_users_role_check CHECK (
    role IS NULL OR role IN (
      'master_supplier','operator','export_manager','quality_control','logistics',
      'master_buyer','procurement','finance','compliance'
    )
  );

-- Status check (extend to include 'invited')
ALTER TABLE public.company_users DROP CONSTRAINT IF EXISTS company_users_status_check;
ALTER TABLE public.company_users
  ADD CONSTRAINT company_users_status_check CHECK (status IN ('active','invited','inactive','pending'));

-- Unique by (company_id, email) when email is set
CREATE UNIQUE INDEX IF NOT EXISTS company_users_company_email_key
  ON public.company_users (company_id, lower(email))
  WHERE email IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS company_users_updated_at ON public.company_users;
CREATE TRIGGER company_users_updated_at
  BEFORE UPDATE ON public.company_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS + open policy (mock-auth phase, matches other CRM/public tables in this project)
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS company_users_public_all ON public.company_users;
CREATE POLICY company_users_public_all ON public.company_users
  FOR ALL TO public USING (true) WITH CHECK (true);
