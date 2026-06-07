CREATE OR REPLACE FUNCTION public.submit_negotiation_round(p_negotiation_id uuid, p_user_id uuid, p_items jsonb)
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
  IF v_next_round > 8 THEN RAISE EXCEPTION 'max_rounds_reached' USING ERRCODE='P0005'; END IF;
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
END; $function$;