-- Batch 3.5/5: add all_customers flag + visibility RPC
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS all_customers boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_offers_visible_to_buyer(p_buyer_company_id uuid)
RETURNS SETOF public.offers
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT o.*
  FROM public.offers o
  WHERE
    -- Branch 1: marketplace default (no targeting at all)
    (
      o.all_customers = false
      AND (o.specific_buyer_company_ids IS NULL OR cardinality(o.specific_buyer_company_ids) = 0)
    )
    -- Branch 2: specific list (independent of marketplace)
    OR (
      o.specific_buyer_company_ids IS NOT NULL
      AND p_buyer_company_id = ANY(o.specific_buyer_company_ids)
    )
    -- Branch 3: all-my-customers (linked + accepted on the offer's office)
    OR (
      o.all_customers = true
      AND o.office_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.supplier_customer_links scl
        WHERE scl.supplier_office_id = o.office_id
          AND scl.buyer_company_id = p_buyer_company_id
          AND scl.status = 'accepted'
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_offers_visible_to_buyer(uuid) TO authenticated, anon, service_role;