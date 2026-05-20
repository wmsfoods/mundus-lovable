-- Add onboarding tracking columns to companies
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarded_from_prospect_id uuid,
  ADD COLUMN IF NOT EXISTS onboarded_by uuid;

CREATE INDEX IF NOT EXISTS companies_type_status_idx
  ON public.companies (is_buyer, is_supplier, status);
CREATE INDEX IF NOT EXISTS companies_country_idx
  ON public.companies (country);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (idempotent)
DROP POLICY IF EXISTS companies_admin_all ON public.companies;
DROP POLICY IF EXISTS companies_member_select ON public.companies;

-- Mundus admins can do everything
CREATE POLICY companies_admin_all
  ON public.companies
  FOR ALL
  TO authenticated
  USING (public.is_mundus_admin())
  WITH CHECK (public.is_mundus_admin());

-- Members can view their own company (needed for useCurrentCompany)
CREATE POLICY companies_member_select
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (id = public.current_user_company_id());