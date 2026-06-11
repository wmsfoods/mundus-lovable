ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS mundus_fee_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mundus_fee_rate numeric(6,5) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_prices jsonb;

COMMENT ON COLUMN public.offers.mundus_fee_included IS 'When TRUE, the values stored in offer_items.price and minimum_price are the FINAL grossed-up prices that already cover the Mundus fee (mundus_fee_rate). Supplier-only flag — must NEVER be returned to buyer-facing queries.';
COMMENT ON COLUMN public.offers.mundus_fee_rate IS 'Mundus fee rate applied to gross up the prices (e.g. 0.003 = 0.30%). Supplier-only.';
COMMENT ON COLUMN public.offers.net_prices IS 'Supplier-only metadata: original NET prices the supplier typed before the fee gross-up. Shape: { "<cutId or tempId>": { "ask": number, "floor": number } }. Must NEVER be returned to buyer-facing queries.';