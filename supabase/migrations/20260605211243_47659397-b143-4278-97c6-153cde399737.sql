ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS primary_pricing_incoterm text;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS pricing_includes_freight boolean;