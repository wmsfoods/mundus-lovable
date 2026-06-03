
-- Revoke full-table SELECT (we'll re-grant only safe columns).
REVOKE SELECT ON public.offer_items FROM authenticated;
REVOKE SELECT ON public.offer_items FROM anon;

-- Re-grant SELECT on every safe column.
GRANT SELECT (
  id, offer_id, customer_product_id, amount, price, condition,
  meat_specification, aging_method, created_at, plant_number, packaging, plant_id
) ON public.offer_items TO authenticated;

GRANT SELECT (
  id, offer_id, customer_product_id, amount, price, condition,
  meat_specification, aging_method, created_at, plant_number, packaging, plant_id
) ON public.offer_items TO anon;

-- service_role keeps full access (edge functions).
GRANT SELECT ON public.offer_items TO service_role;
