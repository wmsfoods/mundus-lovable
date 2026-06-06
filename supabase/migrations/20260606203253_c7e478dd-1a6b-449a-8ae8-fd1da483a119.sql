CREATE OR REPLACE FUNCTION public.admin_reset_playground(level text DEFAULT 'soft')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  counts jsonb := '{}'::jsonb;
  n integer;
BEGIN
  IF NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'forbidden: only Mundus admins can reset playground data';
  END IF;
  IF level NOT IN ('soft', 'hard') THEN
    RAISE EXCEPTION 'invalid level: must be soft or hard';
  END IF;

  -- Shipping / shipment children of orders
  BEGIN DELETE FROM public.shipment_containers; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('shipment_containers', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.shipping_instructions_requests; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('shipping_instructions_requests', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.shipping_instructions; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('shipping_instructions', n); EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Order children → orders
  BEGIN DELETE FROM public.order_item_documents; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('order_item_documents', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.order_item_images; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('order_item_images', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.order_documents; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('order_documents', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.order_shipping_infos; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('order_shipping_infos', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.order_items; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('order_items', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.orders; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('orders', n); EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Auctions
  BEGIN DELETE FROM public.auction_bids; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('auction_bids', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.auctions; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('auctions', n); EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Negotiation children → negotiations
  BEGIN DELETE FROM public.round_proposals; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('round_proposals', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.cut_rounds; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('cut_rounds', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.counter_proposals; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('counter_proposals', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.negotiation_messages; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('negotiation_messages', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.negotiation_audit; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('negotiation_audit', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.negotiation_tokens; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('negotiation_tokens', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.offer_snapshots; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('offer_snapshots', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.motor_jobs; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('motor_jobs', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.negotiations; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('negotiations', n); EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Notifications
  BEGIN DELETE FROM public.app_notifications; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('app_notifications', n); EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Offer engagement children
  BEGIN DELETE FROM public.offer_views; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('offer_views', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.offer_likes; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('offer_likes', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.offer_favorites; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('offer_favorites', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.offer_shares; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('offer_shares', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.offer_distributions; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('offer_distributions', n); EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Offer structural children
  BEGIN DELETE FROM public.freight_options; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('freight_options', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.offer_markets; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('offer_markets', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.offer_origin_ports; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('offer_origin_ports', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.offer_allowed_incoterms; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('offer_allowed_incoterms', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.offer_items; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('offer_items', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.offers; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('offers', n); EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Buyer requests
  BEGIN DELETE FROM public.buyer_requests; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('buyer_requests', n); EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Customer products
  BEGIN DELETE FROM public.customer_product_documents; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('customer_product_documents', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.customer_product_images; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('customer_product_images', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.customer_products; GET DIAGNOSTICS n = ROW_COUNT;
    counts := counts || jsonb_build_object('customer_products', n); EXCEPTION WHEN undefined_table THEN NULL; END;

  IF level = 'hard' THEN
    BEGIN DELETE FROM public.company_plants; GET DIAGNOSTICS n = ROW_COUNT;
      counts := counts || jsonb_build_object('company_plants', n); EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM public.supplier_brands; GET DIAGNOSTICS n = ROW_COUNT;
      counts := counts || jsonb_build_object('supplier_brands', n); EXCEPTION WHEN undefined_table THEN NULL; END;
  END IF;

  RETURN jsonb_build_object(
    'level', level,
    'success', true,
    'counts', counts,
    'executed_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_playground(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_playground(text) TO authenticated;