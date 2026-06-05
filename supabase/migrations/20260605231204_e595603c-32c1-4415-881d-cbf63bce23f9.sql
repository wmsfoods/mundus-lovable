ALTER TABLE public.offer_items
  ADD COLUMN IF NOT EXISTS fob_ask_price NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS fob_floor_price NUMERIC NULL;

COMMENT ON COLUMN public.offer_items.fob_ask_price IS 'FOB price/kg, fixed at origin. Used when buyer selects FOB incoterm. NULL = supplier not offering FOB pricing for this cut.';
COMMENT ON COLUMN public.offer_items.fob_floor_price IS 'FOB minimum price/kg for negotiation. Optional.';