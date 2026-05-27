
CREATE TABLE IF NOT EXISTS public.company_team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  profile_type text,
  phone text,
  auth_user_id uuid,
  account_status text NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending','invited','active','disabled')),
  invited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_team_members_unique_email_per_company UNIQUE (company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_company_team_members_company ON public.company_team_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_team_members_email ON public.company_team_members(lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_team_members TO authenticated;
GRANT ALL ON public.company_team_members TO service_role;

ALTER TABLE public.company_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mundus admins manage team members"
ON public.company_team_members
FOR ALL
TO authenticated
USING (public.is_mundus_admin())
WITH CHECK (public.is_mundus_admin());

CREATE POLICY "Company members view own team"
ON public.company_team_members
FOR SELECT
TO authenticated
USING (company_id = public.current_user_company_id());

CREATE TRIGGER trg_company_team_members_updated_at
BEFORE UPDATE ON public.company_team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
