
CREATE OR REPLACE FUNCTION public.accept_negotiation(p_negotiation_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text;
  v_last_round_id uuid;
  v_settled_total numeric;
  v_neg record;
  v_order_id uuid;
  v_existing_order uuid;
BEGIN
  SELECT status, offer_id, buyer_company_id, created_by_user_id, port_id, fcl_count,
         incoterm, freight_cost_per_kg, office_id, order_id
    INTO v_neg
    FROM negotiations WHERE id = p_negotiation_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'negotiation_not_found' USING ERRCODE='P0001'; END IF;
  IF v_neg.status <> 'pending_buyer_review' THEN RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002'; END IF;

  SELECT id INTO v_last_round_id FROM round_proposals
    WHERE negotiation_id = p_negotiation_id ORDER BY round DESC LIMIT 1;
  IF v_last_round_id IS NULL THEN RAISE EXCEPTION 'no_rounds_to_accept' USING ERRCODE='P0007'; END IF;

  SELECT COALESCE(SUM(cp.price_per_kg * cr.quantity_kg), 0) INTO v_settled_total
    FROM cut_rounds cr JOIN counter_proposals cp ON cp.cut_round_id = cr.id
    WHERE cr.round_proposal_id = v_last_round_id;
  IF v_settled_total <= 0 THEN RAISE EXCEPTION 'no_counter_to_accept' USING ERRCODE='P0008'; END IF;

  -- Create order
  INSERT INTO orders (
    buyer_id, offer_id, destination_port_id, status, fcl_count,
    incoterm, freight_cost, office_id, placed_at
  ) VALUES (
    v_neg.created_by_user_id, v_neg.offer_id, v_neg.port_id, 'awaiting_payment',
    COALESCE(v_neg.fcl_count, 1), v_neg.incoterm,
    COALESCE(v_neg.freight_cost_per_kg, 0), v_neg.office_id, now()
  ) RETURNING id INTO v_order_id;

  -- Create order_items from the agreed/last counter prices
  INSERT INTO order_items (
    order_id, customer_product_id, customer_product_name, customer_product_description,
    customer_code, standard_product_id, standard_product_name, standard_product_description,
    product_category_id, product_category_code,
    original_amount, settlement_amount, original_price, settlement_price,
    condition, beef_marbling
  )
  SELECT
    v_order_id,
    cp_cust.id,
    cp_cust.name,
    cp_cust.description,
    cp_cust.customer_code,
    sp.id,
    COALESCE(spn.name, sp.description),
    sp.description,
    pc.id,
    pc.code,
    oi.amount,
    cr.quantity_kg,
    oi.price,
    counter.price_per_kg,
    oi.condition,
    NULLIF(cp_cust.beef_marbling::text, '')
  FROM cut_rounds cr
  JOIN counter_proposals counter ON counter.cut_round_id = cr.id
  JOIN offer_items oi ON oi.id = cr.offer_item_id
  JOIN customer_products cp_cust ON cp_cust.id = oi.customer_product_id
  JOIN standard_products sp ON sp.id = cp_cust.standard_product_id
  JOIN product_categories pc ON pc.id = sp.product_category_id
  LEFT JOIN LATERAL (
    SELECT name FROM standard_product_names
    WHERE standard_product_id = sp.id ORDER BY created_at LIMIT 1
  ) spn ON true
  WHERE cr.round_proposal_id = v_last_round_id;

  UPDATE negotiations
    SET status='bid_accepted',
        settled_total_value=v_settled_total,
        settled_round_proposal_id=v_last_round_id,
        order_id=v_order_id
   WHERE id = p_negotiation_id;

  RETURN jsonb_build_object(
    'success', true,
    'settled_total_value', v_settled_total,
    'round_proposal_id', v_last_round_id,
    'order_id', v_order_id
  );
END; $function$;

-- Backfill orders for any already-accepted negotiation without an order
DO $$
DECLARE
  r record;
  v_order_id uuid;
  v_last_round_id uuid;
BEGIN
  FOR r IN
    SELECT id, offer_id, created_by_user_id, port_id, fcl_count, incoterm,
           freight_cost_per_kg, office_id
      FROM negotiations
     WHERE status = 'bid_accepted' AND order_id IS NULL
  LOOP
    SELECT id INTO v_last_round_id FROM round_proposals
      WHERE negotiation_id = r.id ORDER BY round DESC LIMIT 1;
    IF v_last_round_id IS NULL THEN CONTINUE; END IF;

    INSERT INTO orders (
      buyer_id, offer_id, destination_port_id, status, fcl_count,
      incoterm, freight_cost, office_id, placed_at
    ) VALUES (
      r.created_by_user_id, r.offer_id, r.port_id, 'awaiting_payment',
      COALESCE(r.fcl_count, 1), r.incoterm,
      COALESCE(r.freight_cost_per_kg, 0), r.office_id, now()
    ) RETURNING id INTO v_order_id;

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
      oi.amount, cr.quantity_kg, oi.price, counter.price_per_kg,
      oi.condition, NULLIF(cp_cust.beef_marbling::text, '')
    FROM cut_rounds cr
    JOIN counter_proposals counter ON counter.cut_round_id = cr.id
    JOIN offer_items oi ON oi.id = cr.offer_item_id
    JOIN customer_products cp_cust ON cp_cust.id = oi.customer_product_id
    JOIN standard_products sp ON sp.id = cp_cust.standard_product_id
    JOIN product_categories pc ON pc.id = sp.product_category_id
    LEFT JOIN LATERAL (
      SELECT name FROM standard_product_names
      WHERE standard_product_id = sp.id ORDER BY created_at LIMIT 1
    ) spn ON true
    WHERE cr.round_proposal_id = v_last_round_id;

    UPDATE negotiations SET order_id = v_order_id WHERE id = r.id;
  END LOOP;
END $$;
