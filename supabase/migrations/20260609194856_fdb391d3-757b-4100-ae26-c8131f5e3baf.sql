CREATE OR REPLACE FUNCTION public.update_offer_v2_atomic(p_offer_id uuid, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_active_bids int;
  v_offer jsonb := p_payload->'offer';
  v_status text := p_payload->>'status';
BEGIN
  -- Block edit if any existing item already has cut_rounds (active bids).
  SELECT count(*) INTO v_active_bids
  FROM cut_rounds cr
  JOIN offer_items oi ON oi.id = cr.offer_item_id
  WHERE oi.offer_id = p_offer_id;
  IF v_active_bids > 0 THEN
    RAISE EXCEPTION 'offerHasActiveBids';
  END IF;

  -- 1) Update offers (excluding status — applied last).
  UPDATE offers SET
    origin_country = v_offer->>'origin_country',
    origin_port = v_offer->>'origin_port',
    origin_port_id = NULLIF(v_offer->>'origin_port_id','')::uuid,
    shipment_month = NULLIF(v_offer->>'shipment_month','')::int,
    shipment_year = NULLIF(v_offer->>'shipment_year','')::int,
    shipment_ready_raw = v_offer->>'shipment_ready_raw',
    payment_terms = v_offer->>'payment_terms',
    container_size = v_offer->>'container_size',
    total_fcl = COALESCE(NULLIF(v_offer->>'total_fcl','')::int, 1),
    is_halal = COALESCE((v_offer->>'is_halal')::boolean, false),
    is_kosher = COALESCE((v_offer->>'is_kosher')::boolean, false),
    plant_id = NULLIF(v_offer->>'plant_id','')::uuid,
    negotiation_mode = COALESCE(v_offer->>'negotiation_mode', negotiation_mode),
    negotiation_dial = COALESCE(v_offer->>'negotiation_dial', negotiation_dial),
    specific_buyer_company_ids = CASE
      WHEN v_offer->'specific_buyer_company_ids' IS NULL
        OR jsonb_typeof(v_offer->'specific_buyer_company_ids') = 'null'
      THEN NULL
      ELSE ARRAY(SELECT jsonb_array_elements_text(v_offer->'specific_buyer_company_ids'))::uuid[]
    END,
    all_customers = COALESCE((v_offer->>'all_customers')::boolean, false),
    exw_pickup_location = v_offer->>'exw_pickup_location',
    cut_region = COALESCE(v_offer->>'cut_region', cut_region),
    request_id = NULLIF(v_offer->>'request_id','')::uuid,
    primary_pricing_incoterm = v_offer->>'primary_pricing_incoterm',
    pricing_includes_freight = CASE
      WHEN v_offer->>'pricing_includes_freight' IS NULL THEN NULL
      ELSE (v_offer->>'pricing_includes_freight')::boolean
    END,
    pricing_reference_port_id = NULLIF(v_offer->>'pricing_reference_port_id','')::uuid,
    updated_at = now()
  WHERE id = p_offer_id;

  -- 2) Delete children
  DELETE FROM offer_items WHERE offer_id = p_offer_id;
  DELETE FROM offer_allowed_incoterms WHERE offer_id = p_offer_id;
  DELETE FROM offer_markets WHERE offer_id = p_offer_id;
  DELETE FROM freight_options WHERE offer_id = p_offer_id;
  DELETE FROM offer_origin_ports WHERE offer_id = p_offer_id;

  -- 3) Insert items
  IF jsonb_typeof(p_payload->'items') = 'array' THEN
    INSERT INTO offer_items (
      offer_id, customer_product_id, amount, price, minimum_price,
      minimum_amount, maximum_amount, condition, aging_method, us_grade,
      packaging, plant_id, brand_id, notes, photo_url, files_urls
    )
    SELECT
      p_offer_id,
      (it->>'customer_product_id')::uuid,
      (it->>'amount')::numeric,
      (it->>'price')::numeric,
      (it->>'minimum_price')::numeric,
      (it->>'minimum_amount')::numeric,
      (it->>'maximum_amount')::numeric,
      it->>'condition',
      it->>'aging_method',
      it->>'us_grade',
      it->>'packaging',
      NULLIF(it->>'plant_id','')::uuid,
      NULLIF(it->>'brand_id','')::uuid,
      it->>'notes',
      it->>'photo_url',
      CASE WHEN jsonb_typeof(it->'files_urls')='array'
           THEN ARRAY(SELECT jsonb_array_elements_text(it->'files_urls'))
           ELSE NULL END
    FROM jsonb_array_elements(p_payload->'items') AS it;
  END IF;

  -- 4) Incoterms
  IF jsonb_typeof(p_payload->'incoterms') = 'array' THEN
    INSERT INTO offer_allowed_incoterms (offer_id, incoterm_type)
    SELECT p_offer_id, value::text
    FROM jsonb_array_elements_text(p_payload->'incoterms') AS value;
  END IF;

  -- 5) Markets
  IF jsonb_typeof(p_payload->'markets') = 'array' THEN
    INSERT INTO offer_markets (offer_id, market_id)
    SELECT p_offer_id, value::uuid
    FROM jsonb_array_elements_text(p_payload->'markets') AS value;
  END IF;

  -- 6) Origin ports
  IF jsonb_typeof(p_payload->'origin_ports') = 'array' THEN
    INSERT INTO offer_origin_ports (offer_id, port_id)
    SELECT p_offer_id, value::uuid
    FROM jsonb_array_elements_text(p_payload->'origin_ports') AS value;
  END IF;

  -- 7) Freight
  IF jsonb_typeof(p_payload->'freight') = 'array' THEN
    INSERT INTO freight_options (offer_id, port_id, cost, insurance)
    SELECT
      p_offer_id,
      (f->>'port_id')::uuid,
      COALESCE((f->>'cost')::numeric, 0),
      COALESCE((f->>'insurance')::numeric, 0)
    FROM jsonb_array_elements(p_payload->'freight') AS f;
  END IF;

  -- 8) Status last — trigger offers_validate_active_complete fires here.
  IF v_status IS NOT NULL THEN
    UPDATE offers SET status = v_status, updated_at = now() WHERE id = p_offer_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_offer_v2_atomic(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_offer_v2_atomic(uuid, jsonb) TO service_role;