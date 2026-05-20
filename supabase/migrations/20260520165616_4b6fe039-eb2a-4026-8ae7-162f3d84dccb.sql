
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS personal_linkedin text,
  ADD COLUMN IF NOT EXISTS decision_level text;

ALTER TABLE public.crm_companies
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_symbol text,
  ADD COLUMN IF NOT EXISTS stock_exchange text,
  ADD COLUMN IF NOT EXISTS sic_codes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS naics_codes text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS market_segment text,
  ADD COLUMN IF NOT EXISTS headcount_growth_6m numeric(5,4),
  ADD COLUMN IF NOT EXISTS headcount_growth_12m numeric(5,4);
