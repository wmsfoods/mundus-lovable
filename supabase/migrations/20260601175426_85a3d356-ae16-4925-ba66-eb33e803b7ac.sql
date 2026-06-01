-- 1) Add origin marker
ALTER TABLE public.negotiations
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'negotiation'
  CHECK (origin IN ('negotiation','direct_close'));

-- 2) Extend submit_initial_bid with optional p_origin
CREATE OR REPLACE FUNCTION public.submit_initial_bid(
  p_offer_id uuid,
  p_buyer_company_id uuid,
  p_created_by_user_id uuid,
  p_port_id uuid DEFAULT NULL,
  p_freight_cost_per_kg numeric DEFAULT 0,
  p_insurance_per_kg numeric DEFAULT 0,
  p_fcl_count integer DEFAULT 1,
  p_incoterm text DEFAULT 'FOB',
  p_buyer_message text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_origin text DEFAULT 'negotiation'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    AND status IN ('awaiting_supplier','pending_buyer_review')
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

-- 3) Relax submit_negotiation_round to permit countering from pending_confirmation
--    only when origin='negotiation' and rounds remain. The function resets the
--    pending-confirmation state so the deal reopens as a regular round.
CREATE OR REPLACE FUNCTION public.submit_negotiation_round(
  p_negotiation_id uuid, p_user_id uuid, p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
  -- A direct-close deal cannot be countered — supplier must Accept or Reject.
  IF v_status = 'pending_confirmation' AND v_origin = 'direct_close' THEN
    RAISE EXCEPTION 'direct_close_no_counter' USING ERRCODE='P0002';
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
  -- Reset accept/pending state if we reopened from pending_confirmation.
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