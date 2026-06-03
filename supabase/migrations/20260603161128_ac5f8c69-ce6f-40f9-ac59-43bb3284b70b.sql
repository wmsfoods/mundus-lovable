
-- 1) Security-definer accessor: returns floor/min/max for items in offers
--    the caller owns as supplier, or admin sees all.
CREATE OR REPLACE FUNCTION public.get_offer_floors(_offer_ids uuid[])
RETURNS TABLE (
  offer_item_id uuid,
  offer_id uuid,
  minimum_price numeric,
  minimum_amount numeric,
  maximum_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.id, oi.offer_id, oi.minimum_price, oi.minimum_amount, oi.maximum_amount
  FROM public.offer_items oi
  JOIN public.offers o ON o.id = oi.offer_id
  WHERE oi.offer_id = ANY(_offer_ids)
    AND (
      public.is_mundus_admin()
      OR o.supplier_id IN (SELECT public.user_supplier_scope_ids())
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_offer_floors(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_offer_floors(uuid[]) TO service_role;

-- 2) Revoke column-level SELECT of sensitive fields for non-privileged roles.
REVOKE SELECT (minimum_price, minimum_amount, maximum_amount)
  ON public.offer_items FROM authenticated;
REVOKE SELECT (minimum_price, minimum_amount, maximum_amount)
  ON public.offer_items FROM anon;

-- Ensure service_role keeps full access (edge functions use it).
GRANT SELECT ON public.offer_items TO service_role;
