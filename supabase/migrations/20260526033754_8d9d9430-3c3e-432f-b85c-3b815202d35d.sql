CREATE OR REPLACE FUNCTION public.accept_negotiation(p_negotiation_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_neg record;
  v_last_round_id uuid;
  v_last_creator uuid;
  v_order_id uuid;
  v_settled_total numeric := 0;
  v_agreed jsonb;
  v_sold_fcls integer := 0;
  v_total_fcl integer := 1;
BEGIN
  SELECT status, offer_id, buyer_company_id, created_by_user_id, port_id, fcl_count,
         incoterm, freight_cost_per_kg, office_id, order_id, agreed_items, settled_total_value
    INTO v_neg FROM negotiations WHERE id = p_negotiation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'negotiation_not_found' USING ERRCODE='P0001'; END IF;
  IF v_neg.status NOT IN ('pending_buyer_review','awaiting_supplier') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002';
  END IF;

  SELECT id, created_by_user_id INTO v_last_round_id, v_last_creator
    FROM round_proposals
   WHERE negotiation_id = p_negotiation_id
   ORDER BY round DESC LIMIT 1;

  -- Cannot accept your own last round — must accept the counterparty's value.
  IF v_last_creator IS NOT NULL AND v_last_creator = p_user_id THEN
    RAISE EXCEPTION 'cannot_accept_own_round' USING ERRCODE='P0009';
  END IF;

  IF v_neg.agreed_items IS NOT NULL AND jsonb_array_length(v_neg.agreed_items) > 0 THEN
    SELECT COALESCE(SUM( (item->>'price_per_kg')::numeric * oi.amount ), 0) INTO v_settled_total
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

  INSERT INTO orders (
    buyer_id, buyer_company_id, offer_id, destination_port_id, status, fcl_count,
    incoterm, freight_cost, office_id, placed_at, negotiation_id
  ) VALUES (
    v_neg.created_by_user_id, v_neg.buyer_company_id, v_neg.offer_id, v_neg.port_id, 'awaiting_payment',
    COALESCE(v_neg.fcl_count, 1), v_neg.incoterm,
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

  RETURN jsonb_build_object('success', true, 'settled_total_value', v_settled_total,
    'round_proposal_id', v_last_round_id, 'order_id', v_order_id);
END; $function$;