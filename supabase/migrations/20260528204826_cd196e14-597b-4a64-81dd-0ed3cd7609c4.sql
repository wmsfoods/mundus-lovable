ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS qualified_at timestamptz;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS qualified_as text;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_seniority ON public.crm_contacts(seniority);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_qualified_as ON public.crm_contacts(qualified_as);