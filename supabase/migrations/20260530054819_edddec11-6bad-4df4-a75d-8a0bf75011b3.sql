
-- ============================================================
-- Phase 1: Multi-office supplier DB foundation
-- ============================================================

-- 1. Plants: extend company_plants
ALTER TABLE public.company_plants ADD COLUMN IF NOT EXISTS plant_number text;
ALTER TABLE public.company_plants ADD COLUMN IF NOT EXISTS origin_port_id uuid REFERENCES public.ports(id);
ALTER TABLE public.company_plants ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_company_plants_company_active ON public.company_plants(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_company_plants_plant_number ON public.company_plants(plant_number);

COMMENT ON COLUMN public.companies.plant_numbers IS 'DEPRECATED — use public.company_plants';

-- 2. offers.plant_id
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS plant_id uuid REFERENCES public.company_plants(id);
CREATE INDEX IF NOT EXISTS idx_offers_plant_id ON public.offers(plant_id);

-- 3. office_plants
CREATE TABLE IF NOT EXISTS public.office_plants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plant_id  uuid NOT NULL REFERENCES public.company_plants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(office_id, plant_id)
);
CREATE INDEX IF NOT EXISTS idx_office_plants_office ON public.office_plants(office_id);
CREATE INDEX IF NOT EXISTS idx_office_plants_plant  ON public.office_plants(plant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_plants TO authenticated;
GRANT ALL ON public.office_plants TO service_role;
ALTER TABLE public.office_plants ENABLE ROW LEVEL SECURITY;

-- 4. office_markets
CREATE TABLE IF NOT EXISTS public.office_markets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  market_id uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(office_id, market_id)
);
CREATE INDEX IF NOT EXISTS idx_office_markets_office ON public.office_markets(office_id);
CREATE INDEX IF NOT EXISTS idx_office_markets_market ON public.office_markets(market_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_markets TO authenticated;
GRANT ALL ON public.office_markets TO service_role;
ALTER TABLE public.office_markets ENABLE ROW LEVEL SECURITY;

-- 5. Global Director role
INSERT INTO public.roles (name)
SELECT 'supplier_global_director'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'supplier_global_director');

-- 6. Helper functions
CREATE OR REPLACE FUNCTION public.company_family_root(p_company_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE up AS (
    SELECT id, parent_company_id FROM public.companies WHERE id = p_company_id
    UNION ALL
    SELECT c.id, c.parent_company_id
      FROM public.companies c JOIN up ON c.id = up.parent_company_id
      WHERE up.parent_company_id IS NOT NULL
  )
  SELECT id FROM up WHERE parent_company_id IS NULL LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.company_family_ids(p_company_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE root AS (SELECT public.company_family_root(p_company_id) AS rid),
  down AS (
    SELECT id FROM public.companies WHERE id = (SELECT rid FROM root)
    UNION ALL
    SELECT c.id FROM public.companies c JOIN down ON c.parent_company_id = down.id
  )
  SELECT id FROM down;
$$;

CREATE OR REPLACE FUNCTION public.is_family_global_director(p_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    LEFT JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
      AND COALESCE(cu.status,'active') = 'active'
      AND cu.company_id = public.company_family_root(p_company_id)
      AND (r.name = 'supplier_global_director' OR cu.role = 'supplier_global_director')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_supplier_scope_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_companies AS (
    SELECT cu.company_id FROM public.company_users cu
     WHERE cu.user_id = auth.uid() AND COALESCE(cu.status,'active') = 'active'
       AND cu.company_id IS NOT NULL
    UNION
    SELECT uo.company_id FROM public.user_offices uo
     WHERE uo.user_id = auth.uid() AND uo.company_id IS NOT NULL
  )
  SELECT DISTINCT fid FROM my_companies mc
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN public.is_family_global_director(mc.company_id)
        THEN (SELECT x FROM public.company_family_ids(mc.company_id) x)
      ELSE mc.company_id
    END
  ) AS expanded(fid)
  WHERE fid IS NOT NULL;
$$;

-- The CASE returns scalar; for the family case we need to expand. Replace with set-returning version.
CREATE OR REPLACE FUNCTION public.user_supplier_scope_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH my_companies AS (
    SELECT cu.company_id FROM public.company_users cu
     WHERE cu.user_id = auth.uid() AND COALESCE(cu.status,'active') = 'active'
       AND cu.company_id IS NOT NULL
    UNION
    SELECT uo.company_id FROM public.user_offices uo
     WHERE uo.user_id = auth.uid() AND uo.company_id IS NOT NULL
  )
  SELECT DISTINCT mc.company_id
    FROM my_companies mc
   WHERE NOT public.is_family_global_director(mc.company_id)
  UNION
  SELECT DISTINCT fid
    FROM my_companies mc,
         LATERAL public.company_family_ids(mc.company_id) AS fid
   WHERE public.is_family_global_director(mc.company_id);
$$;

GRANT EXECUTE ON FUNCTION public.company_family_root(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_family_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_global_director(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_supplier_scope_ids() TO authenticated;

-- 7. RLS — widen supplier-side checks to family scope

-- offers
DROP POLICY IF EXISTS offers_insert_supplier ON public.offers;
DROP POLICY IF EXISTS offers_update_supplier ON public.offers;
DROP POLICY IF EXISTS offers_delete_supplier ON public.offers;
CREATE POLICY offers_insert_supplier ON public.offers FOR INSERT TO authenticated
  WITH CHECK (is_mundus_admin() OR supplier_id IN (SELECT public.user_supplier_scope_ids()));
CREATE POLICY offers_update_supplier ON public.offers FOR UPDATE TO authenticated
  USING (is_mundus_admin() OR supplier_id IN (SELECT public.user_supplier_scope_ids()))
  WITH CHECK (is_mundus_admin() OR supplier_id IN (SELECT public.user_supplier_scope_ids()));
CREATE POLICY offers_delete_supplier ON public.offers FOR DELETE TO authenticated
  USING (is_mundus_admin() OR supplier_id IN (SELECT public.user_supplier_scope_ids()));

-- company_plants
DROP POLICY IF EXISTS company_plants_member_all ON public.company_plants;
DROP POLICY IF EXISTS company_plants_select_family ON public.company_plants;
DROP POLICY IF EXISTS company_plants_write_director ON public.company_plants;
CREATE POLICY company_plants_select_family ON public.company_plants FOR SELECT TO authenticated
  USING (is_mundus_admin() OR company_id IN (SELECT public.user_supplier_scope_ids()));
CREATE POLICY company_plants_write_director ON public.company_plants FOR ALL TO authenticated
  USING (is_mundus_admin() OR public.is_family_global_director(company_id))
  WITH CHECK (is_mundus_admin() OR public.is_family_global_director(company_id));

-- office_plants
DROP POLICY IF EXISTS office_plants_select ON public.office_plants;
DROP POLICY IF EXISTS office_plants_write ON public.office_plants;
CREATE POLICY office_plants_select ON public.office_plants FOR SELECT TO authenticated
  USING (is_mundus_admin() OR office_id IN (SELECT public.user_supplier_scope_ids()));
CREATE POLICY office_plants_write ON public.office_plants FOR ALL TO authenticated
  USING (is_mundus_admin() OR public.is_family_global_director(office_id))
  WITH CHECK (is_mundus_admin() OR public.is_family_global_director(office_id));

-- office_markets
DROP POLICY IF EXISTS office_markets_select ON public.office_markets;
DROP POLICY IF EXISTS office_markets_write ON public.office_markets;
CREATE POLICY office_markets_select ON public.office_markets FOR SELECT TO authenticated
  USING (is_mundus_admin() OR office_id IN (SELECT public.user_supplier_scope_ids()));
CREATE POLICY office_markets_write ON public.office_markets FOR ALL TO authenticated
  USING (is_mundus_admin() OR public.is_family_global_director(office_id))
  WITH CHECK (is_mundus_admin() OR public.is_family_global_director(office_id));

-- negotiations: update access function to use family scope on supplier side
CREATE OR REPLACE FUNCTION public.user_can_access_negotiation(p_negotiation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_mundus_admin()
  OR EXISTS (
    SELECT 1
    FROM public.negotiations n
    JOIN public.offers o ON o.id = n.offer_id
    LEFT JOIN public.users u ON u.id = auth.uid()
    WHERE n.id = p_negotiation_id
      AND (
        COALESCE(u.active_company_id, u.company_id) = n.buyer_company_id
        OR o.supplier_id IN (SELECT public.user_supplier_scope_ids())
        OR EXISTS (
          SELECT 1 FROM public.company_users cu
           WHERE cu.user_id = auth.uid()
             AND cu.status = 'active'
             AND cu.company_id = n.buyer_company_id
        )
      )
  );
$$;

-- orders
DROP POLICY IF EXISTS orders_select_parties_or_admin ON public.orders;
DROP POLICY IF EXISTS orders_update_parties_or_admin ON public.orders;
CREATE POLICY orders_select_parties_or_admin ON public.orders FOR SELECT TO authenticated
  USING (
    is_mundus_admin()
    OR buyer_company_id = current_user_company_id()
    OR buyer_company_id IN (SELECT public.current_user_company_ids())
    OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = orders.offer_id
                AND o.supplier_id IN (SELECT public.user_supplier_scope_ids()))
  );
CREATE POLICY orders_update_parties_or_admin ON public.orders FOR UPDATE TO authenticated
  USING (
    is_mundus_admin()
    OR buyer_company_id = current_user_company_id()
    OR buyer_company_id IN (SELECT public.current_user_company_ids())
    OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = orders.offer_id
                AND o.supplier_id IN (SELECT public.user_supplier_scope_ids()))
  )
  WITH CHECK (
    is_mundus_admin()
    OR buyer_company_id = current_user_company_id()
    OR buyer_company_id IN (SELECT public.current_user_company_ids())
    OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = orders.offer_id
                AND o.supplier_id IN (SELECT public.user_supplier_scope_ids()))
  );

-- offer_items
DROP POLICY IF EXISTS offer_items_write_owner ON public.offer_items;
DROP POLICY IF EXISTS oi_insert ON public.offer_items;
CREATE POLICY offer_items_write_owner ON public.offer_items FOR ALL TO authenticated
  USING (is_mundus_admin() OR EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = offer_items.offer_id
      AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())))
  WITH CHECK (is_mundus_admin() OR EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = offer_items.offer_id
      AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())));
CREATE POLICY oi_insert ON public.offer_items FOR INSERT TO authenticated
  WITH CHECK (is_mundus_admin() OR EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = offer_items.offer_id
      AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())));

-- offer_markets
DROP POLICY IF EXISTS offer_markets_write_owner ON public.offer_markets;
DROP POLICY IF EXISTS om_insert ON public.offer_markets;
CREATE POLICY offer_markets_write_owner ON public.offer_markets FOR ALL TO authenticated
  USING (is_mundus_admin() OR EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = offer_markets.offer_id
      AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())))
  WITH CHECK (is_mundus_admin() OR EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = offer_markets.offer_id
      AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())));
CREATE POLICY om_insert ON public.offer_markets FOR INSERT TO authenticated
  WITH CHECK (is_mundus_admin() OR EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = offer_markets.offer_id
      AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())));

-- offer_allowed_incoterms
DROP POLICY IF EXISTS offer_incoterms_write_owner ON public.offer_allowed_incoterms;
DROP POLICY IF EXISTS oai_insert ON public.offer_allowed_incoterms;
CREATE POLICY offer_incoterms_write_owner ON public.offer_allowed_incoterms FOR ALL TO authenticated
  USING (is_mundus_admin() OR EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = offer_allowed_incoterms.offer_id
      AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())))
  WITH CHECK (is_mundus_admin() OR EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = offer_allowed_incoterms.offer_id
      AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())));
CREATE POLICY oai_insert ON public.offer_allowed_incoterms FOR INSERT TO authenticated
  WITH CHECK (is_mundus_admin() OR EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = offer_allowed_incoterms.offer_id
      AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())));

-- offer_distributions
DROP POLICY IF EXISTS "Supplier sees own distributions" ON public.offer_distributions;
CREATE POLICY "Supplier sees own distributions" ON public.offer_distributions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = offer_distributions.offer_id
      AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())));

-- offer_views
DROP POLICY IF EXISTS "Supplier sees own offer views" ON public.offer_views;
CREATE POLICY "Supplier sees own offer views" ON public.offer_views FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.offers o WHERE o.id = offer_views.offer_id
      AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())));

-- negotiation_messages: rewrite supplier-side check to family scope
DROP POLICY IF EXISTS "Participants see messages" ON public.negotiation_messages;
DROP POLICY IF EXISTS "Participants update proposal status" ON public.negotiation_messages;
CREATE POLICY "Participants see messages" ON public.negotiation_messages FOR SELECT TO authenticated
  USING (public.user_can_access_negotiation(negotiation_id));
CREATE POLICY "Participants update proposal status" ON public.negotiation_messages FOR UPDATE TO authenticated
  USING (public.user_can_access_negotiation(negotiation_id))
  WITH CHECK (public.user_can_access_negotiation(negotiation_id));

-- round_proposals & cut_rounds already use user_can_access_negotiation — covered.
