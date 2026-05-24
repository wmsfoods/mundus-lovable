
ALTER TABLE public.negotiations
  ADD COLUMN IF NOT EXISTS insurance_per_kg numeric DEFAULT 0;

ALTER TABLE public.round_proposals
  ADD COLUMN IF NOT EXISTS incoterm text,
  ADD COLUMN IF NOT EXISTS freight_per_kg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_per_kg numeric DEFAULT 0;
