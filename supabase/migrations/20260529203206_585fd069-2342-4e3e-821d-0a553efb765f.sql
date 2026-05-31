
-- Two-step deal confirmation: accept -> pending_confirmation -> counterparty confirms

-- 1) Extend status check to include 'pending_confirmation'
ALTER TABLE public.negotiations DROP CONSTRAINT IF EXISTS negotiations_status_check;
ALTER TABLE public.negotiations
  ADD CONSTRAINT negotiations_status_check CHECK (
    status = ANY (ARRAY[
      'awaiting_supplier'::text,
      'pending_buyer_review'::text,
      'pending_confirmation'::text,
      'bid_accepted'::text,
      'offer_rejected'::text,
      'offer_exhausted'::text,
      'expired'::text,
      'offer_withdrawn'::text
    ])
  );

-- 2) Tracking columns for the acceptance step
ALTER TABLE public.negotiations
  ADD COLUMN IF NOT EXISTS accepted_by text,
  ADD COLUMN IF NOT EXISTS accepted_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_total_value numeric(18,2),
  ADD COLUMN IF NOT EXISTS accepted_round_proposal_id uuid;

-- 3) Internal helper that creates the order + items + sold_out check.
-- Returns the new order id. Assumes status validation done by caller.
CREATE OR REPLACE FUNCTION public._finalize_negotiation_close(p_negotiation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_neg record;
  v_order_id uuid;
  v_settled_total numeric := 0;
  v_agreed jsonb;
  v_last_round_id uuid;
  v_sold_fcls int := 0;
  v_total_fcl int := 1;
BEGIN
  SELECT id, offer_id, buyer_company_id, created_by_user_id, port_id, fcl_count,
         incoterm, freight_cost_per_kg, office_id, agreed_items,
         accepted_total_value, accepted_round_proposal_id
    INTO v_neg
    FROM negotiations
   WHERE id = p_negotiation_id
   FOR UPDATE;

  v_last_round_id := v_neg.accepted_round_proposal_id;
  IF v_last_round_id IS NULL THEN
    SELECT id INTO v_last_round_id FROM round_proposals
     WHERE negotiation_id = p_negotiation_id ORDER BY round DESC LIMIT 1;
  END IF;

  v_settled_total := COALESCE(v_neg.accepted_total_value, 0);
  IF v_settled_total <= 0 THEN
    IF v_neg.agreed_items IS NOT NULL AND jsonb_array_length(v_neg.agreed_items) > 0 THEN
      SELECT COALESCE(SUM( (item->>'price_per_kg')::numeric * oi.amount ), 0)
        INTO v_settled_total
        FROM jsonb_array_elements(v_neg.agreed_items) AS item
        JOIN offer_items oi ON oi.id = (item->>'offer_item_id')::uuid;
    ELSIF v_last_round_id IS NOT NULL THEN
      SELECT COALESCE(SUM(COALESCE(cp.price_per_kg, cr.price_per_kg) * cr.quantity_kg), 0)
        INTO v_settled_total
        FROM cut_rounds cr
        LEFT JOIN counter_proposals cp ON cp.cut_round_id = cr.id
        WHERE cr.round_proposal_id = v_last_round_id;
    END IF;
  END IF;
  IF v_settled_total <= 0 THEN
    RAISE EXCEPTION 'no_counter_to_accept' USING ERRCODE = 'P0008';
  END IF;

  INSERT INTO orders (
    buyer_id, buyer_company_id, offer_id, destination_port_id, status, fcl_count,
    incoterm, freight_cost, office_id, placed_at, negotiation_id
  ) VALUES (
    v_neg.created_by_user_id, v_neg.buyer_company_id, v_neg.offer_id, v_neg.port_id,
    'awaiting_payment', COALESCE(v_neg.fcl_count, 1), v_neg.incoterm,
    COALESCE(v_neg.freight_cost_per_kg, 0), v_neg.office_id, now(), p_negotiation_id
  ) RETURNING id INTO v_order_id;

  IF v_neg.agreed_items IS NOT NULL AND jsonb_array_length(v_neg.agreed_items) > 0 THEN
    v_agreed := v_neg.agreed_items;
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'offer_item_id', cr.offer_item_id,
      'price_per_kg', COALESCE(cp.price_per_kg, cr.price_per_kg)
    )), '[]'::jsonb) INTO v_agreed
    FROM cut_rounds cr
    LEFT JOIN counter_proposals cp ON cp.cut_round_id = cr.id
    WHERE cr.round_proposal_id = v_last_round_id;
  END IF;

  INSERT INTO order_items (
    order_id, customer_product_id, customer_product_name, customer_product_description,
    customer_code, standard_product_id, standard_product_name, standard_product_description,
    product_category_id, product_category_code,
    original_amount, settlement_amount, original_price, settlement_price,
    condition, beef_marbling
  )
  SELECT
    v_order_id, cp_cust.id, cp_cust.name, cp_cust.description, cp_cust.customer_code,
    sp.id, COALESCE(spn.name, sp.description), sp.description,
    pc.id, pc.code,
    oi.amount, oi.amount, oi.price, (item->>'price_per_kg')::numeric,
    oi.condition, NULLIF(cp_cust.beef_marbling::text, '')
  FROM jsonb_array_elements(v_agreed) AS item
  JOIN offer_items oi ON oi.id = (item->>'offer_item_id')::uuid
  JOIN customer_products cp_cust ON cp_cust.id = oi.customer_product_id
  JOIN standard_products sp ON sp.id = cp_cust.standard_product_id
  JOIN product_categories pc ON pc.id = sp.product_category_id
  LEFT JOIN LATERAL (
    SELECT name FROM standard_product_names
    WHERE standard_product_id = sp.id ORDER BY created_at LIMIT 1
  ) spn ON true;

  UPDATE negotiations
    SET status='bid_accepted',
        settled_total_value=v_settled_total,
        settled_round_proposal_id=v_last_round_id,
        order_id=v_order_id
   WHERE id = p_negotiation_id;

  SELECT COALESCE(SUM(fcl_count), 0) INTO v_sold_fcls
    FROM negotiations
   WHERE offer_id = v_neg.offer_id AND status = 'bid_accepted' AND deleted_at IS NULL;
  SELECT COALESCE(total_fcl, 1) INTO v_total_fcl FROM offers WHERE id = v_neg.offer_id;
  IF v_sold_fcls >= v_total_fcl THEN
    UPDATE offers SET status='sold_out' WHERE id = v_neg.offer_id AND status <> 'sold_out';
  END IF;

  RETURN v_order_id;
END;
$$;

-- 4) Rewrite accept_negotiation: now sets pending_confirmation, never closes the deal directly.
DROP FUNCTION IF EXISTS public.accept_negotiation(uuid, uuid);
DROP FUNCTION IF EXISTS public.accept_negotiation(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.accept_negotiation(
  p_negotiation_id uuid,
  p_user_id uuid,
  p_accepted_by text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_neg record;
  v_last_round_id uuid;
  v_last_creator uuid;
  v_settled_total numeric := 0;
BEGIN
  IF p_accepted_by NOT IN ('buyer','supplier') THEN
    RAISE EXCEPTION 'invalid_accepted_by' USING ERRCODE='22023';
  END IF;

  SELECT status, offer_id, buyer_company_id, agreed_items
    INTO v_neg
    FROM negotiations
   WHERE id = p_negotiation_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'negotiation_not_found' USING ERRCODE='P0001'; END IF;

  IF v_neg.status NOT IN ('pending_buyer_review','awaiting_supplier') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002';
  END IF;

  SELECT id, created_by_user_id INTO v_last_round_id, v_last_creator
    FROM round_proposals
   WHERE negotiation_id = p_negotiation_id
   ORDER BY round DESC LIMIT 1;

  IF v_last_creator IS NOT NULL AND v_last_creator = p_user_id THEN
    RAISE EXCEPTION 'cannot_accept_own_round' USING ERRCODE='P0009';
  END IF;

  IF v_neg.agreed_items IS NOT NULL AND jsonb_array_length(v_neg.agreed_items) > 0 THEN
    SELECT COALESCE(SUM( (item->>'price_per_kg')::numeric * oi.amount ), 0)
      INTO v_settled_total
      FROM jsonb_array_elements(v_neg.agreed_items) AS item
      JOIN offer_items oi ON oi.id = (item->>'offer_item_id')::uuid;
  ELSIF v_last_round_id IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(cp.price_per_kg, cr.price_per_kg) * cr.quantity_kg), 0)
      INTO v_settled_total
      FROM cut_rounds cr
      LEFT JOIN counter_proposals cp ON cp.cut_round_id = cr.id
      WHERE cr.round_proposal_id = v_last_round_id;
  END IF;
  IF v_settled_total <= 0 THEN RAISE EXCEPTION 'no_counter_to_accept' USING ERRCODE='P0008'; END IF;

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
$$;

GRANT EXECUTE ON FUNCTION public.accept_negotiation(uuid, uuid, text) TO authenticated;

-- 5) New confirm_negotiation RPC. Counterparty closes the deal (or admin-on-behalf).
CREATE OR REPLACE FUNCTION public.confirm_negotiation(
  p_negotiation_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_neg record;
  v_supplier_id uuid;
  v_buyer_id uuid;
  v_user_company uuid;
  v_user_in_buyer boolean := false;
  v_user_in_supplier boolean := false;
  v_buyer_managed boolean := false;
  v_supplier_managed boolean := false;
  v_is_admin boolean := false;
  v_order_id uuid;
  v_total numeric;
BEGIN
  SELECT n.status, n.accepted_by, n.accepted_by_user_id, n.accepted_total_value,
         n.buyer_company_id, o.supplier_id
    INTO v_neg
    FROM negotiations n
    JOIN offers o ON o.id = n.offer_id
   WHERE n.id = p_negotiation_id
   FOR UPDATE OF n;
  IF NOT FOUND THEN RAISE EXCEPTION 'negotiation_not_found' USING ERRCODE='P0001'; END IF;
  IF v_neg.status <> 'pending_confirmation' THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002';
  END IF;

  v_buyer_id := v_neg.buyer_company_id;
  v_supplier_id := v_neg.supplier_id;

  SELECT COALESCE(active_company_id, company_id) INTO v_user_company
    FROM users WHERE id = p_user_id;

  v_user_in_buyer := (v_user_company = v_buyer_id)
    OR EXISTS (SELECT 1 FROM company_users cu
                WHERE cu.user_id = p_user_id AND cu.company_id = v_buyer_id
                  AND COALESCE(cu.status,'active')='active');
  v_user_in_supplier := (v_user_company = v_supplier_id)
    OR EXISTS (SELECT 1 FROM company_users cu
                WHERE cu.user_id = p_user_id AND cu.company_id = v_supplier_id
                  AND COALESCE(cu.status,'active')='active');

  SELECT EXISTS (
    SELECT 1 FROM company_users cu JOIN roles r ON r.id = cu.role_id
     WHERE cu.user_id = p_user_id AND r.name = 'mundus_admin'
  ) INTO v_is_admin;

  SELECT mundus_managed_buyer INTO v_buyer_managed FROM companies WHERE id = v_buyer_id;
  SELECT mundus_managed_supplier INTO v_supplier_managed FROM companies WHERE id = v_supplier_id;

  -- Authorization:
  -- 1) Counterparty (the side that did NOT accept) is always allowed.
  -- 2) Mundus admin allowed when either side is managed (act-on-behalf shortcut).
  IF v_neg.accepted_by = 'buyer' THEN
    -- supplier must confirm (or admin on behalf of either managed side)
    IF NOT (v_user_in_supplier
            OR (v_is_admin AND (COALESCE(v_supplier_managed,false) OR COALESCE(v_buyer_managed,false)))) THEN
      RAISE EXCEPTION 'not_counterparty' USING ERRCODE='42501';
    END IF;
  ELSIF v_neg.accepted_by = 'supplier' THEN
    IF NOT (v_user_in_buyer
            OR (v_is_admin AND (COALESCE(v_buyer_managed,false) OR COALESCE(v_supplier_managed,false)))) THEN
      RAISE EXCEPTION 'not_counterparty' USING ERRCODE='42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid_accepted_by' USING ERRCODE='P0002';
  END IF;

  v_order_id := public._finalize_negotiation_close(p_negotiation_id);
  v_total := v_neg.accepted_total_value;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'settled_total_value', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_negotiation(uuid, uuid) TO authenticated;

-- 6) Allow rejecting from pending_confirmation as well (counterparty can decline).
CREATE OR REPLACE FUNCTION public.reject_negotiation(p_negotiation_id uuid, p_user_id uuid, p_reason text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_status text;
BEGIN
  SELECT status INTO v_status FROM negotiations WHERE id = p_negotiation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'negotiation_not_found' USING ERRCODE='P0001'; END IF;
  IF v_status NOT IN ('awaiting_supplier','pending_buyer_review','pending_confirmation') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002';
  END IF;
  UPDATE negotiations
     SET status='offer_rejected',
         accepted_by = NULL,
         accepted_by_user_id = NULL,
         accepted_at = NULL,
         accepted_total_value = NULL,
         accepted_round_proposal_id = NULL
   WHERE id = p_negotiation_id;
  RETURN jsonb_build_object('success', true);
END;
$$;
