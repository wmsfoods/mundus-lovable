-- ============================================================
-- Wave 1: Negotiation backend guards
-- ============================================================

-- 1) Unique index includes pending_confirmation
DROP INDEX IF EXISTS public.negotiations_unique_active_per_buyer_offer;
CREATE UNIQUE INDEX negotiations_unique_active_per_buyer_offer
  ON public.negotiations (buyer_company_id, offer_id)
  WHERE status IN ('awaiting_supplier','pending_buyer_review','pending_confirmation')
    AND deleted_at IS NULL;

-- 2) submit_initial_bid: also reuse pending_confirmation as "existing"
CREATE OR REPLACE FUNCTION public.submit_initial_bid(
  p_offer_id uuid,
  p_buyer_company_id uuid,
  p_created_by_user_id uuid,
  p_port_id uuid DEFAULT NULL::uuid,
  p_freight_cost_per_kg numeric DEFAULT 0,
  p_insurance_per_kg numeric DEFAULT 0,
  p_fcl_count integer DEFAULT 1,
  p_incoterm text DEFAULT 'FOB'::text,
  p_buyer_message text DEFAULT NULL::text,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_origin text DEFAULT 'negotiation'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
  v_negotiation_id uuid;
  v_round_id uuid;
  v_item jsonb;
  v_item_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF p_created_by_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'invalid_user' USING ERRCODE = '42501';
  END IF;
  IF NOT public.user_can_create_negotiation(p_buyer_company_id, p_created_by_user_id) THEN
    RAISE EXCEPTION 'buyer_company_not_allowed' USING ERRCODE = '42501';
  END IF;
  IF p_offer_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.offers WHERE id = p_offer_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'offer_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(p_fcl_count, 0) <= 0 THEN
    RAISE EXCEPTION 'invalid_fcl_count' USING ERRCODE = '22023';
  END IF;
  v_item_count := COALESCE(jsonb_array_length(p_items), 0);
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'empty_items' USING ERRCODE = 'P0006';
  END IF;
  IF COALESCE(p_origin,'negotiation') NOT IN ('negotiation','direct_close') THEN
    RAISE EXCEPTION 'invalid_origin' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_existing_id
  FROM public.negotiations
  WHERE offer_id = p_offer_id
    AND buyer_company_id = p_buyer_company_id
    AND status IN ('awaiting_supplier','pending_buyer_review','pending_confirmation')
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'existing', true, 'negotiation_id', v_existing_id);
  END IF;

  INSERT INTO public.negotiations (
    offer_id, buyer_company_id, created_by_user_id, port_id,
    freight_cost_per_kg, insurance_per_kg, fcl_count, incoterm,
    status, expires_at, buyer_message, origin
  ) VALUES (
    p_offer_id, p_buyer_company_id, p_created_by_user_id, p_port_id,
    COALESCE(p_freight_cost_per_kg, 0), COALESCE(p_insurance_per_kg, 0),
    p_fcl_count, COALESCE(NULLIF(p_incoterm,''),'FOB'),
    'awaiting_supplier', now() + interval '24 hours',
    NULLIF(trim(COALESCE(p_buyer_message,'')),''), COALESCE(p_origin,'negotiation')
  ) RETURNING id INTO v_negotiation_id;

  INSERT INTO public.round_proposals (
    negotiation_id, round, created_by_user_id, side, type, message,
    incoterm, freight_per_kg, insurance_per_kg
  ) VALUES (
    v_negotiation_id, 1, p_created_by_user_id, 'buyer', 'bid',
    NULLIF(trim(COALESCE(p_buyer_message,'')),''),
    COALESCE(NULLIF(p_incoterm,''),'FOB'),
    COALESCE(p_freight_cost_per_kg, 0),
    COALESCE(p_insurance_per_kg, 0)
  ) RETURNING id INTO v_round_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.offer_items oi
      WHERE oi.id = (v_item->>'offer_item_id')::uuid
        AND oi.offer_id = p_offer_id
    ) THEN
      RAISE EXCEPTION 'offer_item_mismatch' USING ERRCODE = 'P0007';
    END IF;
    INSERT INTO public.cut_rounds (
      round_proposal_id, offer_item_id, price_per_kg, quantity_kg
    ) VALUES (
      v_round_id,
      (v_item->>'offer_item_id')::uuid,
      (v_item->>'price_per_kg')::numeric,
      (v_item->>'quantity_kg')::numeric
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'existing', false, 'negotiation_id', v_negotiation_id);
END;
$function$;

-- 3) Cap rounds at 6 raw (3 bid/counter pairs). Enforced by trigger so
--    both direct frontend inserts and submit_negotiation_round are covered.
CREATE OR REPLACE FUNCTION public.enforce_max_round_proposals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.round IS NULL OR NEW.round < 1 THEN
    RAISE EXCEPTION 'invalid_round' USING ERRCODE='22023';
  END IF;
  IF NEW.round > 6 THEN
    RAISE EXCEPTION 'max_rounds_reached' USING ERRCODE='P0005',
      DETAIL='Negotiation capped at 3 bid/counter pairs.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_round_proposals ON public.round_proposals;
CREATE TRIGGER trg_enforce_max_round_proposals
  BEFORE INSERT ON public.round_proposals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_max_round_proposals();

-- Lower submit_negotiation_round internal cap from 8 to 6 to match
CREATE OR REPLACE FUNCTION public.submit_negotiation_round(
  p_negotiation_id uuid,
  p_user_id uuid,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status text; v_locked_until timestamptz; v_expires_at timestamptz;
  v_origin text;
  v_max_round int; v_next_round int; v_round_id uuid; v_item jsonb;
  v_cut_id uuid; v_result_items jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_items' USING ERRCODE = 'P0006';
  END IF;
  SELECT status, locked_until, expires_at, COALESCE(origin,'negotiation')
    INTO v_status, v_locked_until, v_expires_at, v_origin
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
  IF v_next_round > 6 THEN RAISE EXCEPTION 'max_rounds_reached' USING ERRCODE='P0005'; END IF;
  IF v_next_round = 1 AND v_status <> 'awaiting_supplier' THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002';
  END IF;
  IF v_next_round > 1 AND v_status NOT IN ('awaiting_supplier','pending_buyer_review','pending_confirmation') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002';
  END IF;
  IF v_status = 'pending_confirmation' AND v_origin = 'direct_close' THEN
    RAISE EXCEPTION 'direct_close_no_counter' USING ERRCODE='P0002';
  END IF;
  INSERT INTO round_proposals (negotiation_id, round, created_by_user_id, side, type)
    VALUES (p_negotiation_id, v_next_round, p_user_id, 'supplier', 'counter') RETURNING id INTO v_round_id;
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
  UPDATE negotiations
     SET status='pending_buyer_review',
         accepted_by = NULL,
         accepted_by_user_id = NULL,
         accepted_at = NULL,
         accepted_total_value = NULL,
         accepted_round_proposal_id = NULL
   WHERE id = p_negotiation_id;
  RETURN jsonb_build_object('round', v_next_round, 'round_proposal_id', v_round_id, 'items', v_result_items);
END;
$function$;

-- 4) accept_negotiation: floor validation + role-based (company) gate
CREATE OR REPLACE FUNCTION public.accept_negotiation(
  p_negotiation_id uuid,
  p_user_id uuid,
  p_accepted_by text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_neg record;
  v_offer record;
  v_last_round_id uuid;
  v_last_creator uuid;
  v_last_side text;
  v_settled_total numeric := 0;
  v_floor_violated boolean := false;
  v_acceptor_company uuid;
  v_last_creator_company uuid;
BEGIN
  IF p_accepted_by NOT IN ('buyer','supplier') THEN
    RAISE EXCEPTION 'invalid_accepted_by' USING ERRCODE='22023';
  END IF;

  SELECT n.status, n.offer_id, n.buyer_company_id, n.agreed_items, o.supplier_id
    INTO v_neg
    FROM negotiations n
    JOIN offers o ON o.id = n.offer_id
   WHERE n.id = p_negotiation_id
   FOR UPDATE OF n;
  IF NOT FOUND THEN RAISE EXCEPTION 'negotiation_not_found' USING ERRCODE='P0001'; END IF;

  IF v_neg.status NOT IN ('pending_buyer_review','awaiting_supplier') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002';
  END IF;

  SELECT id, created_by_user_id, side
    INTO v_last_round_id, v_last_creator, v_last_side
    FROM round_proposals
   WHERE negotiation_id = p_negotiation_id
   ORDER BY round DESC LIMIT 1;

  -- Role/company gate (C-7): block any user from the same company that
  -- created the last round. Acceptor must belong to the opposite side.
  IF v_last_creator IS NOT NULL THEN
    IF v_last_side = 'buyer' THEN
      v_last_creator_company := v_neg.buyer_company_id;
    ELSE
      v_last_creator_company := v_neg.supplier_id;
    END IF;

    IF p_accepted_by = 'buyer' THEN
      v_acceptor_company := v_neg.buyer_company_id;
    ELSE
      v_acceptor_company := v_neg.supplier_id;
    END IF;

    IF v_acceptor_company = v_last_creator_company THEN
      RAISE EXCEPTION 'cannot_accept_own_side_round' USING ERRCODE='P0009';
    END IF;
  END IF;

  -- Compute settled total + floor validation (per offer_item.minimum_price)
  IF v_neg.agreed_items IS NOT NULL AND jsonb_array_length(v_neg.agreed_items) > 0 THEN
    SELECT
      COALESCE(SUM( (item->>'price_per_kg')::numeric * oi.amount ), 0),
      bool_or( oi.minimum_price IS NOT NULL
               AND (item->>'price_per_kg')::numeric < oi.minimum_price )
      INTO v_settled_total, v_floor_violated
      FROM jsonb_array_elements(v_neg.agreed_items) AS item
      JOIN offer_items oi ON oi.id = (item->>'offer_item_id')::uuid;
  ELSIF v_last_round_id IS NOT NULL THEN
    SELECT
      COALESCE(SUM(COALESCE(cp.price_per_kg, cr.price_per_kg) * cr.quantity_kg), 0),
      bool_or( oi.minimum_price IS NOT NULL
               AND COALESCE(cp.price_per_kg, cr.price_per_kg) < oi.minimum_price )
      INTO v_settled_total, v_floor_violated
      FROM cut_rounds cr
      JOIN offer_items oi ON oi.id = cr.offer_item_id
      LEFT JOIN counter_proposals cp ON cp.cut_round_id = cr.id
      WHERE cr.round_proposal_id = v_last_round_id;
  END IF;

  IF v_settled_total <= 0 THEN
    RAISE EXCEPTION 'no_counter_to_accept' USING ERRCODE='P0008';
  END IF;

  -- Floor check on supplier acceptance only (supplier defines floor;
  -- buyer cannot violate supplier's own counter).
  IF p_accepted_by = 'supplier' AND COALESCE(v_floor_violated, false) THEN
    -- Generic message: never expose the floor value to the client.
    RAISE EXCEPTION 'price_below_minimum' USING ERRCODE='P0012';
  END IF;

  UPDATE negotiations
     SET status = 'pending_confirmation',
         accepted_by = p_accepted_by,
         accepted_by_user_id = p_user_id,
         accepted_at = now(),
         accepted_total_value = v_settled_total,
         accepted_round_proposal_id = v_last_round_id,
         expires_at = NULL
   WHERE id = p_negotiation_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'pending_confirmation',
    'accepted_by', p_accepted_by,
    'accepted_total_value', v_settled_total,
    'round_proposal_id', v_last_round_id
  );
END;
$function$;