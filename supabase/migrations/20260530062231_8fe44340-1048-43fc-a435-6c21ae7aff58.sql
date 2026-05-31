
-- ============================================================
-- Phase 3.5 — Request routing (HQ → office)
-- ============================================================

-- 1. Routing columns on buyer_requests
ALTER TABLE public.buyer_requests
  ADD COLUMN IF NOT EXISTS assigned_office_id  uuid REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS assigned_by_user_id uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS assigned_at         timestamptz,
  ADD COLUMN IF NOT EXISTS routing_status      text NOT NULL DEFAULT 'unassigned';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'buyer_requests_routing_status_chk'
  ) THEN
    ALTER TABLE public.buyer_requests
      ADD CONSTRAINT buyer_requests_routing_status_chk
      CHECK (routing_status IN ('unassigned','assigned'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_buyer_requests_assigned_office ON public.buyer_requests(assigned_office_id);
CREATE INDEX IF NOT EXISTS idx_buyer_requests_routing_status  ON public.buyer_requests(routing_status);

-- Auto-routing flag (HQ-level, off by default)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS auto_route_requests boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Helpers
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_family_hq(p_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.companies WHERE parent_company_id = p_company_id);
$$;

-- Is the auth user an "HQ-level" member of the family root (not office-locked)?
CREATE OR REPLACE FUNCTION public.is_family_hq_member(p_any_company_in_family uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND COALESCE(cu.status,'active') = 'active'
      AND cu.company_id = public.company_family_root(p_any_company_in_family)
  );
$$;

-- ============================================================
-- 3. Assignment RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_request_to_office(
  p_request_id uuid,
  p_office_id  uuid,
  p_user_id    uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_req record;
  v_family_anchor uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_req FROM public.buyer_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found' USING ERRCODE='P0001'; END IF;

  v_family_anchor := COALESCE(v_req.target_supplier_id, p_office_id);

  IF p_office_id NOT IN (SELECT public.company_family_ids(v_family_anchor)) THEN
    RAISE EXCEPTION 'office_not_in_family' USING ERRCODE='42501';
  END IF;

  IF NOT (
    public.is_mundus_admin()
    OR public.is_family_global_director(p_office_id)
    OR public.is_family_hq_member(p_office_id)
  ) THEN
    RAISE EXCEPTION 'not_authorized_to_assign' USING ERRCODE='42501';
  END IF;

  UPDATE public.buyer_requests
     SET assigned_office_id  = p_office_id,
         assigned_by_user_id = p_user_id,
         assigned_at         = now(),
         routing_status      = 'assigned'
   WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true, 'assigned_office_id', p_office_id);
END $$;

GRANT EXECUTE ON FUNCTION public.assign_request_to_office(uuid,uuid,uuid) TO authenticated;

-- ============================================================
-- 4. Auto-route stub (DEFINED, NOT WIRED)
-- enable in a later phase; HQ assigns manually for now
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_route_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_req record;
  v_country_id uuid;
  v_office uuid;
  v_match_count int;
BEGIN
  SELECT * INTO v_req FROM public.buyer_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF v_req.routing_status = 'assigned' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_assigned');
  END IF;
  IF v_req.target_supplier_id IS NULL OR NOT public.is_family_hq(v_req.target_supplier_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_family');
  END IF;

  SELECT id INTO v_country_id FROM public.countries
   WHERE lower(name) = lower(v_req.destination_country) LIMIT 1;
  IF v_country_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_country');
  END IF;

  SELECT count(DISTINCT om.office_id), MIN(om.office_id)
    INTO v_match_count, v_office
    FROM public.office_markets om
    JOIN public.markets m ON m.id = om.market_id
   WHERE m.country_id = v_country_id
     AND om.office_id IN (SELECT public.company_family_ids(v_req.target_supplier_id));

  IF v_match_count = 1 THEN
    UPDATE public.buyer_requests
       SET assigned_office_id = v_office,
           assigned_at = now(),
           routing_status = 'assigned'
     WHERE id = p_request_id;
    RETURN jsonb_build_object('ok', true, 'assigned_office_id', v_office);
  END IF;

  RETURN jsonb_build_object('ok', false, 'reason', 'ambiguous_or_no_match', 'matches', v_match_count);
END $$;

REVOKE ALL ON FUNCTION public.auto_route_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_route_request(uuid) TO service_role;

-- ============================================================
-- 5. RLS tightening: office operators never see unassigned family pool
--    HQ pool (admin/director/HQ-root member) and the assigned office always see it.
--    Single-office suppliers behave as today.
-- ============================================================

DROP POLICY IF EXISTS buyer_requests_select_scoped ON public.buyer_requests;
CREATE POLICY buyer_requests_select_scoped ON public.buyer_requests
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin()
    OR buyer_company_id = current_user_company_id()
    OR (
      -- Public-ish (no specific target) — visible to all suppliers
      target_supplier_id IS NULL
      AND COALESCE(status, '') NOT IN ('draft','cancelled','archived')
    )
    OR (
      -- Targeted at a non-family-HQ supplier: visible to that supplier scope
      target_supplier_id IS NOT NULL
      AND NOT is_family_hq(target_supplier_id)
      AND target_supplier_id IN (SELECT user_supplier_scope_ids())
    )
    OR (
      -- Targeted at a family HQ: HQ pool always sees it
      target_supplier_id IS NOT NULL
      AND is_family_hq(target_supplier_id)
      AND (
        is_family_global_director(target_supplier_id)
        OR is_family_hq_member(target_supplier_id)
      )
    )
    OR (
      -- Assigned office members see only what was routed to their office
      assigned_office_id IS NOT NULL
      AND assigned_office_id IN (SELECT user_supplier_scope_ids())
    )
  );

-- ============================================================
-- 6. Notification triggers
-- ============================================================

CREATE OR REPLACE FUNCTION public.tg_notify_request_arrived_family()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_family_name text;
BEGIN
  BEGIN
    IF NEW.target_supplier_id IS NOT NULL AND public.is_family_hq(NEW.target_supplier_id) THEN
      SELECT name INTO v_family_name FROM public.companies WHERE id = NEW.target_supplier_id;
      PERFORM public._notify_company(
        NEW.target_supplier_id,
        'New request for ' || COALESCE(v_family_name,'your family'),
        'Assign it to an office — ' || NEW.product_name || ' → ' || NEW.destination_country,
        'bell',
        '/supplier/requests',
        NEW.id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_buyer_requests_notify_family ON public.buyer_requests;
CREATE TRIGGER trg_buyer_requests_notify_family
  AFTER INSERT ON public.buyer_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_request_arrived_family();

CREATE OR REPLACE FUNCTION public.tg_notify_request_assigned_office()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_office_name text;
BEGIN
  BEGIN
    IF (OLD.assigned_office_id IS NULL OR OLD.assigned_office_id IS DISTINCT FROM NEW.assigned_office_id)
       AND NEW.assigned_office_id IS NOT NULL THEN
      SELECT COALESCE(office_name, name) INTO v_office_name
        FROM public.companies WHERE id = NEW.assigned_office_id;
      PERFORM public._notify_company(
        NEW.assigned_office_id,
        'New request assigned to ' || COALESCE(v_office_name,'your office'),
        NEW.product_name || ' → ' || NEW.destination_country,
        'bell',
        '/supplier/requests/' || NEW.id::text,
        NEW.id
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_buyer_requests_notify_assigned ON public.buyer_requests;
CREATE TRIGGER trg_buyer_requests_notify_assigned
  AFTER UPDATE OF assigned_office_id ON public.buyer_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_request_assigned_office();

-- ============================================================
-- Phase 4 — Anonymized cut benchmark
-- ============================================================

CREATE OR REPLACE FUNCTION public.market_cut_benchmark(
  p_standard_product_id uuid,
  p_destination_country text DEFAULT NULL,
  p_since timestamptz DEFAULT (now() - interval '180 days')
) RETURNS TABLE(sample_count int, min_usd_kg numeric, median_usd_kg numeric, max_usd_kg numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_country_id uuid;
  v_count int;
  v_min numeric; v_med numeric; v_max numeric;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  IF p_destination_country IS NOT NULL THEN
    SELECT id INTO v_country_id FROM public.countries
     WHERE lower(name) = lower(p_destination_country) LIMIT 1;
  END IF;

  WITH base AS (
    SELECT oi.price
      FROM public.offer_items oi
      JOIN public.customer_products cp ON cp.id = oi.customer_product_id
      JOIN public.offers o ON o.id = oi.offer_id
      LEFT JOIN public.offer_markets om ON om.offer_id = o.id
      LEFT JOIN public.markets m ON m.id = om.market_id
     WHERE cp.standard_product_id = p_standard_product_id
       AND o.created_at >= p_since
       AND o.deleted_at IS NULL
       AND (v_country_id IS NULL OR m.country_id = v_country_id)
  )
  SELECT count(*)::int,
         min(price),
         percentile_cont(0.5) WITHIN GROUP (ORDER BY price),
         max(price)
    INTO v_count, v_min, v_med, v_max
    FROM base;

  -- Min-sample guard: < 3 → suppress precise values to prevent reverse-engineering
  IF COALESCE(v_count,0) < 3 THEN
    RETURN QUERY SELECT COALESCE(v_count,0), NULL::numeric, NULL::numeric, NULL::numeric;
  ELSE
    RETURN QUERY SELECT v_count, v_min, v_med, v_max;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.market_cut_benchmark(uuid, text, timestamptz) TO authenticated;
