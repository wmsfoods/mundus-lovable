ALTER TABLE public.offer_items
  DROP COLUMN IF EXISTS fob_ask_price,
  DROP COLUMN IF EXISTS fob_floor_price;

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS pricing_reference_port_id UUID NULL REFERENCES public.ports(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.offers.pricing_reference_port_id IS
  'NULL = supplier priced at FOB origin. SET = supplier priced at CFR(this port). System derives other incoterms from freight/insurance per port.';