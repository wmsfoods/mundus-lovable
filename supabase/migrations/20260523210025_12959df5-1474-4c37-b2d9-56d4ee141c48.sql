ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS preferred_payment_terms text,
  ADD COLUMN IF NOT EXISTS preferred_incoterms text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS countries_of_operation text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ports_of_shipment text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS buyer_protein_profile text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS preferred_cuts text[] DEFAULT '{}'::text[];