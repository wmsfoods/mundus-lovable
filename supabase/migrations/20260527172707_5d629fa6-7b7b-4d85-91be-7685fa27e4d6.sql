
CREATE TABLE IF NOT EXISTS public.team_invitations (
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
  CONSTRAINT team_invitations_unique_email_per_company UNIQUE (company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_company ON public.team_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invitations TO authenticated;
GRANT ALL ON public.team_invitations TO service_role;

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mundus admins manage team invitations"
ON public.team_invitations
FOR ALL
TO authenticated
USING (public.is_mundus_admin())
WITH CHECK (public.is_mundus_admin());

CREATE POLICY "Company members view own team invitations"
ON public.team_invitations
FOR SELECT
TO authenticated
USING (company_id = public.current_user_company_id());

CREATE TRIGGER trg_team_invitations_updated_at
BEFORE UPDATE ON public.team_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
