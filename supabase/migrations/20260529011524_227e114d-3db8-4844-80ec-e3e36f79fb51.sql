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
  p_items jsonb DEFAULT '[]'::jsonb
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

  SELECT id INTO v_existing_id
  FROM public.negotiations
  WHERE offer_id = p_offer_id
    AND buyer_company_id = p_buyer_company_id
    AND status IN ('awaiting_supplier', 'pending_buyer_review')
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'existing', true, 'negotiation_id', v_existing_id);
  END IF;

  INSERT INTO public.negotiations (
    offer_id,
    buyer_company_id,
    created_by_user_id,
    port_id,
    freight_cost_per_kg,
    insurance_per_kg,
    fcl_count,
    incoterm,
    status,
    expires_at,
    buyer_message
  ) VALUES (
    p_offer_id,
    p_buyer_company_id,
    p_created_by_user_id,
    p_port_id,
    COALESCE(p_freight_cost_per_kg, 0),
    COALESCE(p_insurance_per_kg, 0),
    p_fcl_count,
    COALESCE(NULLIF(p_incoterm, ''), 'FOB'),
    'awaiting_supplier',
    now() + interval '24 hours',
    NULLIF(trim(COALESCE(p_buyer_message, '')), '')
  ) RETURNING id INTO v_negotiation_id;

  INSERT INTO public.round_proposals (
    negotiation_id,
    round,
    created_by_user_id,
    side,
    type,
    message,
    incoterm,
    freight_per_kg,
    insurance_per_kg
  ) VALUES (
    v_negotiation_id,
    1,
    p_created_by_user_id,
    'buyer',
    'bid',
    NULLIF(trim(COALESCE(p_buyer_message, '')), ''),
    COALESCE(NULLIF(p_incoterm, ''), 'FOB'),
    COALESCE(p_freight_cost_per_kg, 0),
    COALESCE(p_insurance_per_kg, 0)
  ) RETURNING id INTO v_round_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.offer_items oi
      WHERE oi.id = (v_item->>'offer_item_id')::uuid
        AND oi.offer_id = p_offer_id
    ) THEN
      RAISE EXCEPTION 'offer_item_mismatch' USING ERRCODE = 'P0007';
    END IF;

    INSERT INTO public.cut_rounds (
      round_proposal_id,
      offer_item_id,
      price_per_kg,
      quantity_kg
    ) VALUES (
      v_round_id,
      (v_item->>'offer_item_id')::uuid,
      (v_item->>'price_per_kg')::numeric,
      (v_item->>'quantity_kg')::numeric
    );
  END LOOP;

  INSERT INTO public.negotiation_tokens (negotiation_id)
  VALUES (v_negotiation_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'existing', false,
    'negotiation_id', v_negotiation_id,
    'round_proposal_id', v_round_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_initial_bid(uuid, uuid, uuid, uuid, numeric, numeric, integer, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_initial_bid(uuid, uuid, uuid, uuid, numeric, numeric, integer, text, text, jsonb) TO service_role;