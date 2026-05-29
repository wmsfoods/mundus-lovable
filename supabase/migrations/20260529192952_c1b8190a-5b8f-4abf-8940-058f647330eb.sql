
-- 1. Offer-level toggle: allow buyers to negotiate item quantities
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS allow_quantity_negotiation boolean NOT NULL DEFAULT false;

-- 2. Extend negotiation_messages for chat-proposal lifecycle
ALTER TABLE public.negotiation_messages
  ADD COLUMN IF NOT EXISTS promoted_to_order_id uuid REFERENCES public.orders(id),
  ADD COLUMN IF NOT EXISTS confirmed_by_proposer_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- 3. Expand proposal_status enum-check
ALTER TABLE public.negotiation_messages
  DROP CONSTRAINT IF EXISTS negotiation_messages_proposal_status_check;
ALTER TABLE public.negotiation_messages
  ADD CONSTRAINT negotiation_messages_proposal_status_check
  CHECK (proposal_status IS NULL OR proposal_status = ANY (ARRAY[
    'pending','accepted','declined','countered',
    'accepted_pending_confirmation','cancelled','superseded'
  ]));

-- 4. Helper: get supplier_company_id for a negotiation
CREATE OR REPLACE FUNCTION public._neg_parties(p_negotiation_id uuid)
RETURNS TABLE(buyer_company_id uuid, supplier_company_id uuid, offer_id uuid, status text, fcl_count int, port_id uuid, incoterm text, freight_cost_per_kg numeric, office_id uuid, created_by_user_id uuid, allow_qty boolean, current_round int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.buyer_company_id, o.supplier_id, n.offer_id, n.status, n.fcl_count, n.port_id, n.incoterm,
         n.freight_cost_per_kg, n.office_id, n.created_by_user_id,
         COALESCE(o.allow_quantity_negotiation, false), COALESCE(n.current_round, 1)
    FROM public.negotiations n
    JOIN public.offers o ON o.id = n.offer_id
   WHERE n.id = p_negotiation_id;
$$;

-- 5. accept_chat_proposal: counterparty taps Accept → moves to pending confirmation
CREATE OR REPLACE FUNCTION public.accept_chat_proposal(p_message_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_msg record;
  v_neg record;
  v_user_company uuid;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_msg FROM public.negotiation_messages WHERE id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'message_not_found' USING ERRCODE='P0001'; END IF;
  IF v_msg.message_type <> 'proposal' THEN RAISE EXCEPTION 'not_a_proposal' USING ERRCODE='P0002'; END IF;
  IF COALESCE(v_msg.proposal_status,'') <> 'pending' THEN RAISE EXCEPTION 'proposal_not_pending' USING ERRCODE='P0002'; END IF;
  IF v_msg.superseded_at IS NOT NULL THEN RAISE EXCEPTION 'proposal_superseded' USING ERRCODE='P0002'; END IF;
  IF v_msg.sender_user_id = v_user THEN RAISE EXCEPTION 'cannot_accept_own_proposal' USING ERRCODE='P0009'; END IF;

  SELECT * INTO v_neg FROM public._neg_parties(v_msg.negotiation_id);
  IF NOT FOUND THEN RAISE EXCEPTION 'negotiation_not_found' USING ERRCODE='P0001'; END IF;
  IF v_neg.status NOT IN ('awaiting_supplier','pending_buyer_review') THEN
    RAISE EXCEPTION 'negotiation_not_active' USING ERRCODE='P0002';
  END IF;

  -- Authorization: user must belong to buyer or supplier company
  SELECT company_id INTO v_user_company FROM public.company_users
    WHERE user_id = v_user AND company_id IN (v_neg.buyer_company_id, v_neg.supplier_company_id)
      AND COALESCE(status,'active') = 'active'
    LIMIT 1;
  IF v_user_company IS NULL AND NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
  END IF;

  UPDATE public.negotiation_messages
     SET proposal_status = 'accepted_pending_confirmation',
         accepted_by_user_id = v_user,
         accepted_at = now()
   WHERE id = p_message_id;

  RETURN jsonb_build_object('success', true, 'status', 'accepted_pending_confirmation');
END $$;

-- 6. cancel_chat_proposal: author or accepter cancels pending / pending_confirmation
CREATE OR REPLACE FUNCTION public.cancel_chat_proposal(p_message_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_msg record;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_msg FROM public.negotiation_messages WHERE id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'message_not_found' USING ERRCODE='P0001'; END IF;
  IF v_msg.message_type <> 'proposal' THEN RAISE EXCEPTION 'not_a_proposal' USING ERRCODE='P0002'; END IF;
  IF COALESCE(v_msg.proposal_status,'') NOT IN ('pending','accepted_pending_confirmation') THEN
    RAISE EXCEPTION 'cannot_cancel' USING ERRCODE='P0002';
  END IF;
  IF v_msg.sender_user_id <> v_user AND v_msg.accepted_by_user_id IS DISTINCT FROM v_user AND NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
  END IF;
  -- If accepter cancels, revert to pending; if author cancels, mark cancelled
  IF v_msg.sender_user_id = v_user OR public.is_mundus_admin() THEN
    UPDATE public.negotiation_messages SET proposal_status='cancelled' WHERE id = p_message_id;
    RETURN jsonb_build_object('success', true, 'status', 'cancelled');
  ELSE
    UPDATE public.negotiation_messages
       SET proposal_status='pending', accepted_by_user_id=NULL, accepted_at=NULL
     WHERE id = p_message_id;
    RETURN jsonb_build_object('success', true, 'status', 'pending');
  END IF;
END $$;

-- 7. confirm_chat_proposal: author confirms → close deal & create order
CREATE OR REPLACE FUNCTION public.confirm_chat_proposal(p_message_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_msg record;
  v_neg record;
  v_user uuid := auth.uid();
  v_items jsonb;
  v_item jsonb;
  v_offer_total_kg numeric := 0;
  v_proposed_total_kg numeric := 0;
  v_order_id uuid;
  v_settled_total numeric := 0;
  v_agreed jsonb := '[]'::jsonb;
  v_sold_fcls int := 0;
  v_total_fcl int := 1;
  v_oi record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501'; END IF;

  SELECT * INTO v_msg FROM public.negotiation_messages WHERE id = p_message_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'message_not_found' USING ERRCODE='P0001'; END IF;
  IF v_msg.message_type <> 'proposal' THEN RAISE EXCEPTION 'not_a_proposal' USING ERRCODE='P0002'; END IF;
  IF COALESCE(v_msg.proposal_status,'') <> 'accepted_pending_confirmation' THEN
    RAISE EXCEPTION 'not_awaiting_confirmation' USING ERRCODE='P0002';
  END IF;
  IF v_msg.superseded_at IS NOT NULL THEN RAISE EXCEPTION 'proposal_superseded' USING ERRCODE='P0002'; END IF;
  IF v_msg.sender_user_id <> v_user AND NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'only_proposer_can_confirm' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_neg FROM public._neg_parties(v_msg.negotiation_id);
  IF v_neg.status NOT IN ('awaiting_supplier','pending_buyer_review') THEN
    RAISE EXCEPTION 'negotiation_not_active' USING ERRCODE='P0002';
  END IF;

  v_items := COALESCE(v_msg.structured_data->'items', '[]'::jsonb);
  IF jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'empty_items' USING ERRCODE='P0006';
  END IF;

  -- Compute offer total_kg & validate items
  SELECT COALESCE(SUM(amount), 0) INTO v_offer_total_kg
    FROM public.offer_items WHERE offer_id = v_neg.offer_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    IF (v_item->>'offer_item_id') IS NULL THEN
      RAISE EXCEPTION 'missing_offer_item_id' USING ERRCODE='P0007';
    END IF;
    SELECT * INTO v_oi FROM public.offer_items
      WHERE id = (v_item->>'offer_item_id')::uuid AND offer_id = v_neg.offer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'offer_item_mismatch' USING ERRCODE='P0007'; END IF;
    IF NOT v_neg.allow_qty AND (v_item->>'quantity_kg')::numeric <> v_oi.amount THEN
      RAISE EXCEPTION 'quantity_locked_by_supplier' USING ERRCODE='P0010';
    END IF;
    IF (v_item->>'price_per_kg')::numeric <= 0 OR (v_item->>'quantity_kg')::numeric <= 0 THEN
      RAISE EXCEPTION 'invalid_values' USING ERRCODE='22023';
    END IF;
    v_proposed_total_kg := v_proposed_total_kg + (v_item->>'quantity_kg')::numeric;
    v_settled_total := v_settled_total + (v_item->>'price_per_kg')::numeric * (v_item->>'quantity_kg')::numeric;
    v_agreed := v_agreed || jsonb_build_object(
      'offer_item_id', (v_item->>'offer_item_id')::uuid,
      'price_per_kg', (v_item->>'price_per_kg')::numeric,
      'quantity_kg', (v_item->>'quantity_kg')::numeric
    );
  END LOOP;

  -- Total quantity must always match the offer
  IF round(v_proposed_total_kg, 3) <> round(v_offer_total_kg, 3) THEN
    RAISE EXCEPTION 'total_quantity_mismatch' USING ERRCODE='P0011',
      DETAIL = format('proposed=%s offer=%s', v_proposed_total_kg, v_offer_total_kg);
  END IF;

  -- Create the order (mirrors accept_negotiation)
  INSERT INTO public.orders (
    buyer_id, buyer_company_id, offer_id, destination_port_id, status, fcl_count,
    incoterm, freight_cost, office_id, placed_at, negotiation_id
  ) VALUES (
    v_neg.created_by_user_id, v_neg.buyer_company_id, v_neg.offer_id, v_neg.port_id,
    'awaiting_payment', COALESCE(v_neg.fcl_count, 1), v_neg.incoterm,
    COALESCE(v_neg.freight_cost_per_kg, 0), v_neg.office_id, now(), v_msg.negotiation_id
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
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
    oi.amount, (item->>'quantity_kg')::numeric, oi.price, (item->>'price_per_kg')::numeric,
    oi.condition, NULLIF(cp_cust.beef_marbling::text, '')
  FROM jsonb_array_elements(v_agreed) AS item
  JOIN public.offer_items oi ON oi.id = (item->>'offer_item_id')::uuid
  JOIN public.customer_products cp_cust ON cp_cust.id = oi.customer_product_id
  JOIN public.standard_products sp ON sp.id = cp_cust.standard_product_id
  JOIN public.product_categories pc ON pc.id = sp.product_category_id
  LEFT JOIN LATERAL (
    SELECT name FROM public.standard_product_names
     WHERE standard_product_id = sp.id ORDER BY created_at LIMIT 1
  ) spn ON true;

  UPDATE public.negotiations
     SET status='bid_accepted',
         agreed_items=v_agreed,
         settled_total_value=v_settled_total,
         order_id=v_order_id
   WHERE id = v_msg.negotiation_id;

  UPDATE public.negotiation_messages
     SET proposal_status='accepted',
         confirmed_by_proposer_at=now(),
         promoted_to_order_id=v_order_id
   WHERE id = p_message_id;

  -- Mark every other still-pending proposal in this negotiation as superseded
  UPDATE public.negotiation_messages
     SET superseded_at = now(),
         proposal_status = 'superseded'
   WHERE negotiation_id = v_msg.negotiation_id
     AND id <> p_message_id
     AND message_type = 'proposal'
     AND proposal_status IN ('pending','accepted_pending_confirmation');

  -- Sold-out check
  SELECT COALESCE(SUM(fcl_count),0) INTO v_sold_fcls
    FROM public.negotiations
   WHERE offer_id = v_neg.offer_id AND status='bid_accepted' AND deleted_at IS NULL;
  SELECT COALESCE(total_fcl,1) INTO v_total_fcl FROM public.offers WHERE id = v_neg.offer_id;
  IF v_sold_fcls >= v_total_fcl THEN
    UPDATE public.offers SET status='sold_out' WHERE id = v_neg.offer_id AND status <> 'sold_out';
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'settled_total_value', v_settled_total);
END $$;

-- 8. Trigger: a new official round supersedes any pending chat proposals
CREATE OR REPLACE FUNCTION public.tg_supersede_pending_chat_proposals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.negotiation_messages
     SET superseded_at = now(),
         proposal_status = 'superseded'
   WHERE negotiation_id = NEW.negotiation_id
     AND message_type = 'proposal'
     AND proposal_status IN ('pending','accepted_pending_confirmation')
     AND created_at < NEW.created_at;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS round_proposals_supersede_chat ON public.round_proposals;
CREATE TRIGGER round_proposals_supersede_chat
AFTER INSERT ON public.round_proposals
FOR EACH ROW EXECUTE FUNCTION public.tg_supersede_pending_chat_proposals();

-- 9. Grants for new RPCs
GRANT EXECUTE ON FUNCTION public.accept_chat_proposal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_chat_proposal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_chat_proposal(uuid) TO authenticated;
