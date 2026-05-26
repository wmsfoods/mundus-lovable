
-- 1. Drop overly-permissive public policy on cut_rounds (leaks historical prices to anon).
DROP POLICY IF EXISTS "cut_rounds_public_all" ON public.cut_rounds;

-- 2. UPDATE policy on negotiations — only company members can transition status.
DROP POLICY IF EXISTS "neg_update" ON public.negotiations;
CREATE POLICY "neg_update" ON public.negotiations
  FOR UPDATE
  USING (public.user_can_access_negotiation(id))
  WITH CHECK (public.user_can_access_negotiation(id));

-- 3. INSERT policy on round_proposals — buyer or supplier company members of the negotiation.
DROP POLICY IF EXISTS "rp_insert" ON public.round_proposals;
CREATE POLICY "rp_insert" ON public.round_proposals
  FOR INSERT
  WITH CHECK (public.user_can_access_negotiation(negotiation_id));

-- 4. INSERT policy on cut_rounds — must reference a round_proposal in a negotiation the user can access.
DROP POLICY IF EXISTS "cr_insert" ON public.cut_rounds;
CREATE POLICY "cr_insert" ON public.cut_rounds
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.round_proposals rp
      WHERE rp.id = round_proposal_id
        AND public.user_can_access_negotiation(rp.negotiation_id)
    )
  );

-- 5. Increase round cap from 3 → 8 to match MAX_RAW_ROUNDS in the frontend.
ALTER TABLE public.round_proposals
  DROP CONSTRAINT IF EXISTS round_proposals_round_check;
ALTER TABLE public.round_proposals
  ADD CONSTRAINT round_proposals_round_check CHECK (round >= 1 AND round <= 8);

-- 6. Update submit_negotiation_round RPC to allow up to 8 rounds.
CREATE OR REPLACE FUNCTION public.submit_negotiation_round(p_negotiation_id uuid, p_user_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status text; v_locked_until timestamptz; v_expires_at timestamptz;
  v_max_round int; v_next_round int; v_round_id uuid; v_item jsonb;
  v_cut_id uuid; v_result_items jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty_items' USING ERRCODE = 'P0006';
  END IF;
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
  IF v_next_round > 8 THEN RAISE EXCEPTION 'max_rounds_reached' USING ERRCODE='P0005'; END IF;
  IF v_next_round = 1 AND v_status <> 'awaiting_supplier' THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='P0002';
  END IF;
  IF v_next_round > 1 AND v_status NOT IN ('awaiting_supplier','pending_buyer_review') THEN
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
END; $function$;
