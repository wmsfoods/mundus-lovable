-- ============================================================================
-- Mundus Trade — Sistema de Negociação (port C# → TS/Supabase)
-- Migration consolidada: 5 tabelas + 3 RPCs + 2 helpers + RLS + triggers + indexes
-- Idempotente: pode rodar em banco limpo OU em cima do estado atual.
-- ============================================================================

-- ─── 0. CLEANUP ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "cp_select" ON counter_proposals;
DROP POLICY IF EXISTS "cr_select" ON cut_rounds;
DROP POLICY IF EXISTS "rp_select" ON round_proposals;
DROP POLICY IF EXISTS "neg_select" ON negotiations;
DROP POLICY IF EXISTS "neg_insert" ON negotiations;
DROP POLICY IF EXISTS "sns_select" ON supplier_negotiation_settings;
DROP POLICY IF EXISTS "sns_manage" ON supplier_negotiation_settings;
DROP TRIGGER IF EXISTS reset_expiration_on_new_round ON round_proposals;
DROP TRIGGER IF EXISTS set_updated_at_negotiations ON negotiations;
DROP TRIGGER IF EXISTS set_updated_at_supplier_negotiation_settings ON supplier_negotiation_settings;
DROP FUNCTION IF EXISTS submit_negotiation_round(uuid, uuid, jsonb);
DROP FUNCTION IF EXISTS accept_negotiation(uuid, uuid);
DROP FUNCTION IF EXISTS reject_negotiation(uuid, uuid, text);
DROP FUNCTION IF EXISTS user_can_access_negotiation(uuid);
DROP FUNCTION IF EXISTS current_user_company_id();
DROP FUNCTION IF EXISTS tg_reset_negotiation_expiration();
DROP TABLE IF EXISTS counter_proposals CASCADE;
DROP TABLE IF EXISTS cut_rounds CASCADE;
DROP TABLE IF EXISTS round_proposals CASCADE;
DROP TABLE IF EXISTS negotiations CASCADE;
DROP TABLE IF EXISTS supplier_negotiation_settings CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ─── 1. TABELAS ─────────────────────────────────────────────────────────────
CREATE TABLE supplier_negotiation_settings (
  supplier_company_id   uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  expiration_hours      integer CHECK (expiration_hours IS NULL OR expiration_hours > 0),
  lock_minutes          integer NOT NULL DEFAULT 0 CHECK (lock_minutes >= 0),
  allow_manual_override boolean NOT NULL DEFAULT true,
  auto_close_on_final   boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE negotiations (
  id                          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id                    uuid NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
  buyer_company_id            uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  created_by_user_id          uuid NOT NULL REFERENCES users(id),
  port_id                     uuid REFERENCES ports(id),
  freight_cost_per_kg         numeric(18,4) NOT NULL DEFAULT 0 CHECK (freight_cost_per_kg >= 0),
  fcl_count                   integer NOT NULL CHECK (fcl_count > 0),
  incoterm                    text NOT NULL,
  status                      text NOT NULL DEFAULT 'awaiting_supplier'
                                CHECK (status IN ('awaiting_supplier','pending_buyer_review',
                                                  'bid_accepted','offer_rejected',
                                                  'offer_exhausted','expired')),
  settled_total_value         numeric(18,2) CHECK (settled_total_value IS NULL OR settled_total_value > 0),
  settled_round_proposal_id   uuid,
  order_id                    uuid,
  locked_until                timestamptz,
  expires_at                  timestamptz,
  deleted_at                  timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX negotiations_unique_active_per_buyer_offer
  ON negotiations (buyer_company_id, offer_id)
  WHERE status IN ('awaiting_supplier','pending_buyer_review');
CREATE INDEX negotiations_buyer_company_id_idx ON negotiations (buyer_company_id);
CREATE INDEX negotiations_offer_id_idx         ON negotiations (offer_id);
CREATE INDEX negotiations_status_idx           ON negotiations (status);
CREATE INDEX negotiations_locked_until_idx     ON negotiations (locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX negotiations_expires_at_idx       ON negotiations (expires_at)
  WHERE status IN ('awaiting_supplier','pending_buyer_review');

CREATE TABLE round_proposals (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  negotiation_id      uuid NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
  round               integer NOT NULL CHECK (round >= 1 AND round <= 3),
  created_by_user_id  uuid NOT NULL REFERENCES users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (negotiation_id, round)
);
CREATE INDEX round_proposals_negotiation_id_idx ON round_proposals (negotiation_id);

CREATE TABLE cut_rounds (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_proposal_id   uuid NOT NULL REFERENCES round_proposals(id) ON DELETE CASCADE,
  offer_item_id       uuid NOT NULL REFERENCES offer_items(id) ON DELETE RESTRICT,
  price_per_kg        numeric(18,4) NOT NULL CHECK (price_per_kg > 0),
  quantity_kg         numeric(18,3) NOT NULL CHECK (quantity_kg > 0),
  total_value         numeric(18,2) GENERATED ALWAYS AS (round((price_per_kg * quantity_kg), 2)) STORED,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_proposal_id, offer_item_id)
);
CREATE INDEX cut_rounds_round_proposal_id_idx ON cut_rounds (round_proposal_id);
CREATE INDEX cut_rounds_offer_item_id_idx     ON cut_rounds (offer_item_id);

CREATE TABLE counter_proposals (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cut_round_id        uuid NOT NULL UNIQUE REFERENCES cut_rounds(id) ON DELETE CASCADE,
  price_per_kg        numeric(18,4) NOT NULL CHECK (price_per_kg > 0),
  source              text NOT NULL CHECK (source IN ('engine','manual')),
  created_by_user_id  uuid REFERENCES users(id),
  rule                text,
  explanation         text NOT NULL,
  is_final            boolean NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT counter_proposals_source_consistency CHECK (
    (source = 'engine' AND created_by_user_id IS NULL  AND rule IS NOT NULL) OR
    (source = 'manual' AND created_by_user_id IS NOT NULL AND rule IS NULL)
  )
);
CREATE INDEX counter_proposals_cut_round_id_idx ON counter_proposals (cut_round_id);

ALTER TABLE negotiations
  ADD CONSTRAINT negotiations_settled_round_proposal_fk
  FOREIGN KEY (settled_round_proposal_id) REFERENCES round_proposals(id);

-- ─── 2. FUNÇÕES ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tg_reset_negotiation_expiration()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_supplier_id uuid; v_hours int;
BEGIN
  SELECT o.supplier_id INTO v_supplier_id
    FROM negotiations n JOIN offers o ON o.id = n.offer_id
   WHERE n.id = NEW.negotiation_id;
  SELECT expiration_hours INTO v_hours
    FROM supplier_negotiation_settings WHERE supplier_company_id = v_supplier_id;
  UPDATE negotiations
     SET expires_at = CASE WHEN v_hours IS NULL THEN NULL
                           ELSE now() + (v_hours || ' hours')::interval END
   WHERE id = NEW.negotiation_id;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION current_user_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION user_can_access_negotiation(p_negotiation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM negotiations n
    JOIN public.users u ON u.id = auth.uid()
    JOIN offers o ON o.id = n.offer_id
    WHERE n.id = p_negotiation_id
      AND (u.company_id = n.buyer_company_id OR u.company_id = o.supplier_id)
  );
$$;

CREATE OR REPLACE FUNCTION submit_negotiation_round(
  p_negotiation_id uuid, p_user_id uuid, p_items jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status text; v_locked_until timestamptz; v_expires_at timestamptz;
  v_max_round int; v_next_round int; v_round_id uuid; v_item jsonb;
  v_cut_id uuid; v_result_items jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'empty_items' USING ERRCODE='P0006'; END IF;
  SELECT status, locked_until, expires_at INTO v_status, v_locked_until, v_expires_at
    FROM negotiations WHERE id = p_negotiation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'negotiation_not_found' USING ERRCODE='P0001'; END IF;
  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    RAISE EXCEPTION 'negotiation_locked' USING ERRCODE='P0003';
  END IF;
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'negotiation_expired' USING ERRCODE='P0004';
  END IF;
  SELECT COALESCE(MAX(round), 0) INTO v_max_round
    FROM round_proposals WHERE negotiation_id = p_negotiation_id;
  v_next_round := v_max_round + 1;
  IF v_next_round > 3 THEN RAISE EXCEPTION 'max_rounds_reached' USING ERRCODE='P0005'; END IF;
  IF v_next_round = 1 AND v_status <> 'awaiting_supplier' THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002';
  END IF;
  IF v_next_round > 1 AND v_status <> 'pending_buyer_review' THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002';
  END IF;
  INSERT INTO round_proposals (negotiation_id, round, created_by_user_id)
    VALUES (p_negotiation_id, v_next_round, p_user_id) RETURNING id INTO v_round_id;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO cut_rounds (round_proposal_id, offer_item_id, price_per_kg, quantity_kg)
      VALUES (v_round_id, (v_item->>'offer_item_id')::uuid,
              (v_item->>'price_per_kg')::numeric, (v_item->>'quantity_kg')::numeric)
      RETURNING id INTO v_cut_id;
    INSERT INTO counter_proposals (cut_round_id, price_per_kg, source, rule, explanation, is_final)
      VALUES (v_cut_id, (v_item->>'counter_price_per_kg')::numeric, 'engine',
              v_item->>'counter_rule', v_item->>'counter_explanation',
              (v_item->>'counter_is_final')::bool);
    v_result_items := v_result_items || jsonb_build_object(
      'cut_round_id', v_cut_id, 'offer_item_id', (v_item->>'offer_item_id')::uuid,
      'counter_price_per_kg', (v_item->>'counter_price_per_kg')::numeric,
      'counter_rule', v_item->>'counter_rule',
      'counter_is_final', (v_item->>'counter_is_final')::bool);
  END LOOP;
  UPDATE negotiations SET status='pending_buyer_review' WHERE id=p_negotiation_id;
  RETURN jsonb_build_object('round', v_next_round, 'round_proposal_id', v_round_id, 'items', v_result_items);
END; $$;

CREATE OR REPLACE FUNCTION accept_negotiation(p_negotiation_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text; v_last_round_id uuid; v_settled_total numeric;
BEGIN
  SELECT status INTO v_status FROM negotiations WHERE id = p_negotiation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'negotiation_not_found' USING ERRCODE='P0001'; END IF;
  IF v_status <> 'pending_buyer_review' THEN RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002'; END IF;
  SELECT id INTO v_last_round_id FROM round_proposals
    WHERE negotiation_id = p_negotiation_id ORDER BY round DESC LIMIT 1;
  IF v_last_round_id IS NULL THEN RAISE EXCEPTION 'no_rounds_to_accept' USING ERRCODE='P0007'; END IF;
  SELECT COALESCE(SUM(cp.price_per_kg * cr.quantity_kg), 0) INTO v_settled_total
    FROM cut_rounds cr JOIN counter_proposals cp ON cp.cut_round_id = cr.id
    WHERE cr.round_proposal_id = v_last_round_id;
  IF v_settled_total <= 0 THEN RAISE EXCEPTION 'no_counter_to_accept' USING ERRCODE='P0008'; END IF;
  UPDATE negotiations SET status='bid_accepted', settled_total_value=v_settled_total,
    settled_round_proposal_id=v_last_round_id WHERE id = p_negotiation_id;
  RETURN jsonb_build_object('success', true, 'settled_total_value', v_settled_total,
    'round_proposal_id', v_last_round_id);
END; $$;

CREATE OR REPLACE FUNCTION reject_negotiation(p_negotiation_id uuid, p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM negotiations WHERE id = p_negotiation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'negotiation_not_found' USING ERRCODE='P0001'; END IF;
  IF v_status NOT IN ('awaiting_supplier','pending_buyer_review') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002';
  END IF;
  UPDATE negotiations SET status='offer_rejected' WHERE id = p_negotiation_id;
  RETURN jsonb_build_object('success', true);
END; $$;

-- ─── 3. TRIGGERS ────────────────────────────────────────────────────────────
CREATE TRIGGER set_updated_at_negotiations BEFORE UPDATE ON negotiations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_supplier_negotiation_settings BEFORE UPDATE ON supplier_negotiation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER reset_expiration_on_new_round AFTER INSERT ON round_proposals
  FOR EACH ROW EXECUTE FUNCTION tg_reset_negotiation_expiration();

-- ─── 4. ROW-LEVEL SECURITY ──────────────────────────────────────────────────
ALTER TABLE negotiations                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_proposals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cut_rounds                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_proposals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_negotiation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "neg_select" ON negotiations FOR SELECT USING (user_can_access_negotiation(id));
CREATE POLICY "neg_insert" ON negotiations FOR INSERT WITH CHECK (buyer_company_id = current_user_company_id());
CREATE POLICY "rp_select" ON round_proposals FOR SELECT USING (user_can_access_negotiation(negotiation_id));
CREATE POLICY "cr_select" ON cut_rounds FOR SELECT USING (EXISTS (
  SELECT 1 FROM round_proposals rp WHERE rp.id = cut_rounds.round_proposal_id
    AND user_can_access_negotiation(rp.negotiation_id)));
CREATE POLICY "cp_select" ON counter_proposals FOR SELECT USING (EXISTS (
  SELECT 1 FROM cut_rounds cr JOIN round_proposals rp ON rp.id = cr.round_proposal_id
  WHERE cr.id = counter_proposals.cut_round_id AND user_can_access_negotiation(rp.negotiation_id)));
CREATE POLICY "sns_select" ON supplier_negotiation_settings FOR SELECT
  USING (supplier_company_id = current_user_company_id());
CREATE POLICY "sns_manage" ON supplier_negotiation_settings FOR ALL
  USING  (supplier_company_id = current_user_company_id())
  WITH CHECK (supplier_company_id = current_user_company_id());

-- ─── 5. GRANTS ──────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION accept_negotiation(uuid, uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION reject_negotiation(uuid, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION submit_negotiation_round(uuid, uuid, jsonb) FROM public, anon, authenticated;
