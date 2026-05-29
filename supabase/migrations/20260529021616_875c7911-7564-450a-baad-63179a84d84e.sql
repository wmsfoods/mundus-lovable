
-- freight_options
ALTER TABLE public.freight_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "freight_options_select" ON public.freight_options;
DROP POLICY IF EXISTS "freight_options_insert" ON public.freight_options;
DROP POLICY IF EXISTS "freight_options_update" ON public.freight_options;
DROP POLICY IF EXISTS "freight_options_delete" ON public.freight_options;
DROP POLICY IF EXISTS "fo_select" ON public.freight_options;
DROP POLICY IF EXISTS "fo_insert" ON public.freight_options;
DROP POLICY IF EXISTS "fo_update" ON public.freight_options;
DROP POLICY IF EXISTS "fo_delete" ON public.freight_options;
DROP POLICY IF EXISTS "fo_all" ON public.freight_options;

CREATE POLICY "fo_select" ON public.freight_options
FOR SELECT TO authenticated USING (true);

CREATE POLICY "fo_insert" ON public.freight_options
FOR INSERT TO authenticated
WITH CHECK (
  public.is_mundus_admin()
  OR EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = freight_options.offer_id
      AND (
        o.supplier_id = public.current_user_company_id()
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid() AND cu.company_id = o.supplier_id
            AND COALESCE(cu.status, 'active') = 'active'
        )
      )
  )
);

CREATE POLICY "fo_update" ON public.freight_options
FOR UPDATE TO authenticated
USING (
  public.is_mundus_admin()
  OR EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = freight_options.offer_id
      AND (
        o.supplier_id = public.current_user_company_id()
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid() AND cu.company_id = o.supplier_id
            AND COALESCE(cu.status, 'active') = 'active'
        )
      )
  )
);

CREATE POLICY "fo_delete" ON public.freight_options
FOR DELETE TO authenticated
USING (
  public.is_mundus_admin()
  OR EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = freight_options.offer_id
      AND (
        o.supplier_id = public.current_user_company_id()
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid() AND cu.company_id = o.supplier_id
            AND COALESCE(cu.status, 'active') = 'active'
        )
      )
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.freight_options TO authenticated;
GRANT ALL ON public.freight_options TO service_role;

-- offer_items
DROP POLICY IF EXISTS "oi_insert" ON public.offer_items;
CREATE POLICY "oi_insert" ON public.offer_items
FOR INSERT TO authenticated
WITH CHECK (
  public.is_mundus_admin()
  OR EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_items.offer_id
      AND (
        o.supplier_id = public.current_user_company_id()
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid() AND cu.company_id = o.supplier_id
            AND COALESCE(cu.status, 'active') = 'active'
        )
      )
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_items TO authenticated;
GRANT ALL ON public.offer_items TO service_role;

-- offer_allowed_incoterms
DROP POLICY IF EXISTS "oai_insert" ON public.offer_allowed_incoterms;
CREATE POLICY "oai_insert" ON public.offer_allowed_incoterms
FOR INSERT TO authenticated
WITH CHECK (
  public.is_mundus_admin()
  OR EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_allowed_incoterms.offer_id
      AND (
        o.supplier_id = public.current_user_company_id()
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid() AND cu.company_id = o.supplier_id
            AND COALESCE(cu.status, 'active') = 'active'
        )
      )
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_allowed_incoterms TO authenticated;
GRANT ALL ON public.offer_allowed_incoterms TO service_role;

-- offer_markets
DROP POLICY IF EXISTS "om_insert" ON public.offer_markets;
CREATE POLICY "om_insert" ON public.offer_markets
FOR INSERT TO authenticated
WITH CHECK (
  public.is_mundus_admin()
  OR EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_markets.offer_id
      AND (
        o.supplier_id = public.current_user_company_id()
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
          WHERE cu.user_id = auth.uid() AND cu.company_id = o.supplier_id
            AND COALESCE(cu.status, 'active') = 'active'
        )
      )
  )
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_markets TO authenticated;
GRANT ALL ON public.offer_markets TO service_role;
