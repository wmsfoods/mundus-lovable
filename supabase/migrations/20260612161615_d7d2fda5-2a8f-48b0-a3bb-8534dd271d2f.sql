CREATE OR REPLACE FUNCTION public.get_company_delete_blockers(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_users int; v_company_users int; v_offers int;
  v_negotiations_buy int; v_orders_buy int; v_orders_sell int;
  v_buyer_requests int; v_auctions int; v_invites int;
BEGIN
  IF NOT public.is_mundus_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT count(*) INTO v_users FROM public.users WHERE company_id = p_company_id;
  SELECT count(*) INTO v_company_users FROM public.company_users WHERE company_id = p_company_id AND user_id IS NOT NULL;
  SELECT count(*) INTO v_offers FROM public.offers WHERE supplier_id = p_company_id;
  SELECT count(*) INTO v_negotiations_buy FROM public.negotiations WHERE buyer_company_id = p_company_id;
  SELECT count(*) INTO v_orders_buy FROM public.orders WHERE buyer_company_id = p_company_id;
  SELECT count(*) INTO v_orders_sell
    FROM public.orders o
    JOIN public.offers ofr ON ofr.id = o.offer_id
    WHERE ofr.supplier_id = p_company_id;
  SELECT count(*) INTO v_buyer_requests FROM public.buyer_requests WHERE buyer_company_id = p_company_id;
  SELECT count(*) INTO v_auctions FROM public.auctions WHERE supplier_id = p_company_id;
  SELECT count(*) INTO v_invites FROM public.company_users WHERE company_id = p_company_id AND user_id IS NULL;
  RETURN jsonb_build_object(
    'users', v_users, 'company_users', v_company_users, 'offers', v_offers,
    'negotiations_as_buyer', v_negotiations_buy,
    'orders_as_buyer', v_orders_buy, 'orders_as_supplier', v_orders_sell,
    'buyer_requests', v_buyer_requests, 'auctions', v_auctions, 'pending_invites', v_invites,
    'can_delete', (
      v_users = 0 AND v_company_users = 0 AND v_offers = 0
      AND v_negotiations_buy = 0 AND v_orders_buy = 0 AND v_orders_sell = 0
      AND v_buyer_requests = 0 AND v_auctions = 0
    )
  );
END; $function$;