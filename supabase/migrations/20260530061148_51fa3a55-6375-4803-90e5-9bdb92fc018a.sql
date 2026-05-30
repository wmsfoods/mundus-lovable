ALTER TABLE public.offer_items ADD COLUMN IF NOT EXISTS plant_id uuid REFERENCES public.company_plants(id);
CREATE INDEX IF NOT EXISTS idx_offer_items_plant ON public.offer_items(plant_id);
COMMENT ON COLUMN public.offers.plant_id IS 'DEPRECATED: convenience pointer to first cut''s plant. Source of truth is offer_items.plant_id (supports Mix FCL across plants).';