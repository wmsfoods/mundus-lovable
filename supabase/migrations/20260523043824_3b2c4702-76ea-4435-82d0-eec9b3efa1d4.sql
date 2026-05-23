ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS plant_numbers TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.offer_items ADD COLUMN IF NOT EXISTS plant_number TEXT;