
ALTER TABLE public.crm_companies
  ADD COLUMN IF NOT EXISTS lead_type text CHECK (lead_type IN ('buyer','supplier','buyer_supplier')),
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_by uuid,
  ADD COLUMN IF NOT EXISTS deactivation_reason text,
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS crm_contacts_one_primary_per_company
  ON public.crm_contacts (company_id)
  WHERE is_primary = true AND is_active = true;

-- Prevent hard-delete of onboarded companies (must deactivate instead)
CREATE OR REPLACE FUNCTION public.crm_companies_prevent_delete_if_onboarded()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.mundus_company_id IS NOT NULL OR OLD.onboarded_at IS NOT NULL THEN
    RAISE EXCEPTION 'cannot_delete_onboarded_company'
      USING HINT = 'Deactivate the company instead.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_companies_prevent_delete ON public.crm_companies;
CREATE TRIGGER trg_crm_companies_prevent_delete
  BEFORE DELETE ON public.crm_companies
  FOR EACH ROW EXECUTE FUNCTION public.crm_companies_prevent_delete_if_onboarded();
