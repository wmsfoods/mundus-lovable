
-- ============================================================
-- SECURITY HARDENING SPRINT 5 — Remove permissive public policies
-- ============================================================

-- 1) OFFERS / OFFER_ITEMS: drop legacy public ALL policies
DROP POLICY IF EXISTS offers_public_all ON public.offers;
DROP POLICY IF EXISTS offer_items_public_all ON public.offer_items;

-- 2) COUNTER_PROPOSALS: drop public ALL; add scoped write
DROP POLICY IF EXISTS counter_proposals_public_all ON public.counter_proposals;
CREATE POLICY counter_proposals_write_participant ON public.counter_proposals
  FOR ALL TO authenticated
  USING (
    is_mundus_admin() OR EXISTS (
      SELECT 1 FROM cut_rounds cr
      JOIN round_proposals rp ON rp.id = cr.round_proposal_id
      WHERE cr.id = counter_proposals.cut_round_id
        AND user_can_access_negotiation(rp.negotiation_id)
    )
  )
  WITH CHECK (
    is_mundus_admin() OR EXISTS (
      SELECT 1 FROM cut_rounds cr
      JOIN round_proposals rp ON rp.id = cr.round_proposal_id
      WHERE cr.id = counter_proposals.cut_round_id
        AND user_can_access_negotiation(rp.negotiation_id)
    )
  );

-- 3) NEGOTIATION_TOKENS: keep SELECT open (token-based guest lookup); restrict writes
DROP POLICY IF EXISTS "Anyone can insert tokens" ON public.negotiation_tokens;
DROP POLICY IF EXISTS "Anyone can update tokens" ON public.negotiation_tokens;
CREATE POLICY negotiation_tokens_insert_admin ON public.negotiation_tokens
  FOR INSERT TO authenticated
  WITH CHECK (is_mundus_admin());
CREATE POLICY negotiation_tokens_update_admin ON public.negotiation_tokens
  FOR UPDATE TO authenticated
  USING (is_mundus_admin())
  WITH CHECK (is_mundus_admin());
-- service_role bypasses RLS, edge functions remain functional

-- 4) CUTS / CUT_TRANSLATIONS: public read, admin write only
DROP POLICY IF EXISTS cuts_public ON public.cuts;
DROP POLICY IF EXISTS cut_translations_public ON public.cut_translations;
CREATE POLICY cuts_select_all ON public.cuts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY cuts_write_admin ON public.cuts FOR ALL TO authenticated
  USING (is_mundus_admin()) WITH CHECK (is_mundus_admin());
CREATE POLICY cut_translations_select_all ON public.cut_translations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY cut_translations_write_admin ON public.cut_translations FOR ALL TO authenticated
  USING (is_mundus_admin()) WITH CHECK (is_mundus_admin());

-- 5) SHIPMENT_CONTAINERS: scope to order parties
DROP POLICY IF EXISTS shipment_containers_public_all ON public.shipment_containers;
CREATE POLICY shipment_containers_select_party ON public.shipment_containers
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin() OR EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN offers of ON of.id = o.offer_id
      WHERE o.id = shipment_containers.order_id
        AND (o.buyer_company_id = current_user_company_id()
             OR of.supplier_id = current_user_company_id())
    )
  );
CREATE POLICY shipment_containers_write_party ON public.shipment_containers
  FOR ALL TO authenticated
  USING (
    is_mundus_admin() OR EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN offers of ON of.id = o.offer_id
      WHERE o.id = shipment_containers.order_id
        AND (o.buyer_company_id = current_user_company_id()
             OR of.supplier_id = current_user_company_id())
    )
  )
  WITH CHECK (
    is_mundus_admin() OR EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN offers of ON of.id = o.offer_id
      WHERE o.id = shipment_containers.order_id
        AND (o.buyer_company_id = current_user_company_id()
             OR of.supplier_id = current_user_company_id())
    )
  );

-- 6) SHIPPING_INSTRUCTIONS: scope to order parties
DROP POLICY IF EXISTS si_public_all ON public.shipping_instructions;
CREATE POLICY si_select_party ON public.shipping_instructions
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin() OR EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN offers of ON of.id = o.offer_id
      WHERE o.id = shipping_instructions.order_id
        AND (o.buyer_company_id = current_user_company_id()
             OR of.supplier_id = current_user_company_id())
    )
  );
CREATE POLICY si_write_party ON public.shipping_instructions
  FOR ALL TO authenticated
  USING (
    is_mundus_admin() OR EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN offers of ON of.id = o.offer_id
      WHERE o.id = shipping_instructions.order_id
        AND (o.buyer_company_id = current_user_company_id()
             OR of.supplier_id = current_user_company_id())
    )
  )
  WITH CHECK (
    is_mundus_admin() OR EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN offers of ON of.id = o.offer_id
      WHERE o.id = shipping_instructions.order_id
        AND (o.buyer_company_id = current_user_company_id()
             OR of.supplier_id = current_user_company_id())
    )
  );

-- 7) SHIPPING_INSTRUCTIONS_REQUESTS: scope to order parties (guest token use service_role)
DROP POLICY IF EXISTS si_requests_public_all ON public.shipping_instructions_requests;
CREATE POLICY si_requests_select_party ON public.shipping_instructions_requests
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin() OR EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN offers of ON of.id = o.offer_id
      WHERE o.id = shipping_instructions_requests.order_id
        AND (o.buyer_company_id = current_user_company_id()
             OR of.supplier_id = current_user_company_id())
    )
  );
CREATE POLICY si_requests_write_party ON public.shipping_instructions_requests
  FOR ALL TO authenticated
  USING (
    is_mundus_admin() OR EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN offers of ON of.id = o.offer_id
      WHERE o.id = shipping_instructions_requests.order_id
        AND (o.buyer_company_id = current_user_company_id()
             OR of.supplier_id = current_user_company_id())
    )
  )
  WITH CHECK (
    is_mundus_admin() OR EXISTS (
      SELECT 1 FROM orders o
      LEFT JOIN offers of ON of.id = o.offer_id
      WHERE o.id = shipping_instructions_requests.order_id
        AND (o.buyer_company_id = current_user_company_id()
             OR of.supplier_id = current_user_company_id())
    )
  );

-- 8) BUYER_REQUESTS: tighten SELECT — owner/admin always; suppliers see published requests only
DROP POLICY IF EXISTS buyer_requests_select_authenticated ON public.buyer_requests;
CREATE POLICY buyer_requests_select_scoped ON public.buyer_requests
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin()
    OR buyer_company_id = current_user_company_id()
    OR COALESCE(status, '') NOT IN ('draft', 'cancelled', 'archived')
  );

-- 9) AUDIT_LOG: enforce identity on INSERT
DROP POLICY IF EXISTS audit_log_insert_any_auth ON public.audit_log;
CREATE POLICY audit_log_insert_self ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    is_mundus_admin()
    OR (
      user_id = auth.uid()
      AND (company_id IS NULL OR company_id = current_user_company_id())
    )
  );

-- 10) REALTIME: require authentication on subscriptions
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS realtime_authenticated_only ON realtime.messages;
CREATE POLICY realtime_authenticated_only ON realtime.messages
  FOR SELECT TO authenticated USING (true);
