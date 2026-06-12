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
  SELECT count(*) INTO v_auctions FROM public.auctions WHERE supplier_id = p_company_id OR company_id = p_company_id;
  SELECT count(*) INTO v_invites FROM public.company_users WHERE company_id = p_company_id AND user_id IS NULL;

  RETURN jsonb_build_object(
    'users', v_users,
    'company_users', v_company_users,
    'offers', v_offers,
    'negotiations_as_buyer', v_negotiations_buy,
    'orders_as_buyer', v_orders_buy,
    'orders_as_supplier', v_orders_sell,
    'buyer_requests', v_buyer_requests,
    'auctions', v_auctions,
    'pending_invites', v_invites,
    'can_delete', (
      v_offers = 0
      AND v_negotiations_buy = 0
      AND v_orders_buy = 0
      AND v_orders_sell = 0
      AND v_buyer_requests = 0
      AND v_auctions = 0
    )
  );
END; $function$;

CREATE OR REPLACE FUNCTION public.admin_hard_delete_company(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blockers jsonb;
  v_user_ids uuid[];
BEGIN
  IF NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT public.get_company_delete_blockers(p_company_id) INTO v_blockers;
  IF NOT (v_blockers->>'can_delete')::boolean THEN
    RAISE EXCEPTION 'company_has_dependencies: %', v_blockers::text;
  END IF;

  UPDATE public.users SET active_company_id = NULL WHERE active_company_id = p_company_id AND company_id <> p_company_id;
  UPDATE public.users SET active_office_id = NULL WHERE active_office_id = p_company_id AND company_id <> p_company_id;
  UPDATE public.crm_contacts SET office_id = NULL WHERE office_id = p_company_id;
  UPDATE public.buyer_requests SET assigned_office_id = NULL WHERE assigned_office_id = p_company_id;
  UPDATE public.buyer_requests SET target_supplier_id = NULL WHERE target_supplier_id = p_company_id;
  UPDATE public.user_requests SET invited_by_office_id = NULL WHERE invited_by_office_id = p_company_id;
  UPDATE public.user_requests SET approved_company_id = NULL WHERE approved_company_id = p_company_id;
  UPDATE public.companies SET parent_company_id = NULL WHERE parent_company_id = p_company_id;

  SELECT array_agg(id) INTO v_user_ids FROM public.users WHERE company_id = p_company_id;

  IF v_user_ids IS NOT NULL THEN
    UPDATE public.user_requests SET approval_user_id = NULL WHERE approval_user_id = ANY(v_user_ids);
    UPDATE public.user_requests SET invited_by_user_id = NULL WHERE invited_by_user_id = ANY(v_user_ids);
    DELETE FROM public.user_requests WHERE created_user_id = ANY(v_user_ids);
    DELETE FROM public.notifications WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.app_notifications WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.device_push_tokens WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.notification_preferences WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.company_users WHERE user_id = ANY(v_user_ids) OR updated_by = ANY(v_user_ids);
    DELETE FROM public.users WHERE id = ANY(v_user_ids);
    DELETE FROM auth.users WHERE id = ANY(v_user_ids);
  END IF;

  DELETE FROM public.company_users WHERE company_id = p_company_id;
  DELETE FROM public.user_requests WHERE company_id = p_company_id;
  DELETE FROM public.companies WHERE id = p_company_id;

  RETURN jsonb_build_object('ok', true, 'deleted_users', coalesce(array_length(v_user_ids, 1), 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_hard_delete_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_delete_blockers(uuid) TO authenticated;