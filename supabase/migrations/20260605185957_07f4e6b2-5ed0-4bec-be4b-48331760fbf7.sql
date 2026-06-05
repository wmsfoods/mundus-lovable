-- ============================================================================
-- ADMIN DATA MANAGEMENT — Batch A2: soft/hard delete + restore RPCs
-- ============================================================================

-- Soft delete
CREATE OR REPLACE FUNCTION public.admin_soft_delete(
  p_entity_type text,
  p_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_id uuid;
BEGIN
  IF NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'forbidden: not a Mundus admin';
  END IF;

  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('affected', 0);
  END IF;

  CASE p_entity_type
    WHEN 'offer' THEN
      UPDATE public.offers SET deleted_at = now()
        WHERE id = ANY(p_ids) AND deleted_at IS NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'negotiation' THEN
      UPDATE public.negotiations SET deleted_at = now()
        WHERE id = ANY(p_ids) AND deleted_at IS NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'order' THEN
      UPDATE public.orders SET deleted_at = now()
        WHERE id = ANY(p_ids) AND deleted_at IS NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'buyer_request' THEN
      UPDATE public.buyer_requests SET deleted_at = now()
        WHERE id = ANY(p_ids) AND deleted_at IS NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'company' THEN
      UPDATE public.companies SET deleted_at = now()
        WHERE id = ANY(p_ids) AND deleted_at IS NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'user' THEN
      UPDATE public.users SET deleted_at = now()
        WHERE id = ANY(p_ids) AND deleted_at IS NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSE
      RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END CASE;

  FOREACH v_id IN ARRAY p_ids LOOP
    INSERT INTO public.admin_action_log
      (actor_id, action_type, entity_type, entity_id, details)
    VALUES
      (auth.uid(), 'soft_delete', p_entity_type, v_id,
       jsonb_build_object('batch_count', array_length(p_ids,1)));
  END LOOP;

  RETURN jsonb_build_object('affected', v_count);
END;
$$;

-- Restore
CREATE OR REPLACE FUNCTION public.admin_restore(
  p_entity_type text,
  p_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_id uuid;
BEGIN
  IF NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'forbidden: not a Mundus admin';
  END IF;

  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('affected', 0);
  END IF;

  CASE p_entity_type
    WHEN 'offer' THEN
      UPDATE public.offers SET deleted_at = NULL
        WHERE id = ANY(p_ids) AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'negotiation' THEN
      UPDATE public.negotiations SET deleted_at = NULL
        WHERE id = ANY(p_ids) AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'order' THEN
      UPDATE public.orders SET deleted_at = NULL
        WHERE id = ANY(p_ids) AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'buyer_request' THEN
      UPDATE public.buyer_requests SET deleted_at = NULL
        WHERE id = ANY(p_ids) AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'company' THEN
      UPDATE public.companies SET deleted_at = NULL
        WHERE id = ANY(p_ids) AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'user' THEN
      UPDATE public.users SET deleted_at = NULL
        WHERE id = ANY(p_ids) AND deleted_at IS NOT NULL;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSE
      RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END CASE;

  FOREACH v_id IN ARRAY p_ids LOOP
    INSERT INTO public.admin_action_log
      (actor_id, action_type, entity_type, entity_id, details)
    VALUES
      (auth.uid(), 'restore', p_entity_type, v_id,
       jsonb_build_object('batch_count', array_length(p_ids,1)));
  END LOOP;

  RETURN jsonb_build_object('affected', v_count);
END;
$$;

-- Hard delete with FK pre-flight
CREATE OR REPLACE FUNCTION public.admin_hard_delete(
  p_entity_type text,
  p_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_id uuid;
  v_negs int := 0;
  v_orders int := 0;
  v_offers int := 0;
  v_users int := 0;
  v_cps int := 0;
BEGIN
  IF NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'forbidden: not a Mundus admin';
  END IF;

  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('deleted', 0);
  END IF;

  -- Pre-flight FK checks
  IF p_entity_type = 'offer' THEN
    SELECT count(*) INTO v_negs FROM public.negotiations
      WHERE offer_id = ANY(p_ids);
    SELECT count(*) INTO v_orders FROM public.orders
      WHERE offer_id = ANY(p_ids);
    IF v_negs > 0 OR v_orders > 0 THEN
      RETURN jsonb_build_object(
        'blocked', true,
        'reason', format('%s negotiation(s) and %s order(s) reference selected offers', v_negs, v_orders),
        'negotiations', v_negs, 'orders', v_orders
      );
    END IF;
  ELSIF p_entity_type = 'negotiation' THEN
    SELECT count(*) INTO v_orders FROM public.orders
      WHERE negotiation_id = ANY(p_ids);
    IF v_orders > 0 THEN
      RETURN jsonb_build_object(
        'blocked', true,
        'reason', format('%s order(s) reference selected negotiations', v_orders),
        'orders', v_orders
      );
    END IF;
  ELSIF p_entity_type = 'company' THEN
    SELECT count(*) INTO v_offers FROM public.offers WHERE supplier_id = ANY(p_ids);
    SELECT count(*) INTO v_negs FROM public.negotiations WHERE buyer_company_id = ANY(p_ids);
    SELECT count(*) INTO v_users FROM public.company_users WHERE company_id = ANY(p_ids);
    SELECT count(*) INTO v_cps FROM public.customer_products WHERE EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='customer_products' AND column_name='company_id'
    ) AND true; -- guard; ignore if column missing
    IF v_offers > 0 OR v_negs > 0 OR v_users > 0 THEN
      RETURN jsonb_build_object(
        'blocked', true,
        'reason', format('%s offer(s), %s negotiation(s), %s user(s) linked to selected companies', v_offers, v_negs, v_users),
        'offers', v_offers, 'negotiations', v_negs, 'users', v_users
      );
    END IF;
  ELSIF p_entity_type = 'user' THEN
    RAISE EXCEPTION 'Hard delete of users is not supported (use soft delete)';
  END IF;

  CASE p_entity_type
    WHEN 'offer' THEN
      DELETE FROM public.offers WHERE id = ANY(p_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'negotiation' THEN
      DELETE FROM public.negotiations WHERE id = ANY(p_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'order' THEN
      DELETE FROM public.orders WHERE id = ANY(p_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'buyer_request' THEN
      DELETE FROM public.buyer_requests WHERE id = ANY(p_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'company' THEN
      DELETE FROM public.companies WHERE id = ANY(p_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
    WHEN 'cut' THEN
      DELETE FROM public.cuts WHERE id = ANY(p_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSE
      RAISE EXCEPTION 'Unsupported entity_type: %', p_entity_type;
  END CASE;

  FOREACH v_id IN ARRAY p_ids LOOP
    INSERT INTO public.admin_action_log
      (actor_id, action_type, entity_type, entity_id, details)
    VALUES
      (auth.uid(), 'hard_delete', p_entity_type, v_id,
       jsonb_build_object('batch_count', array_length(p_ids,1)));
  END LOOP;

  RETURN jsonb_build_object('deleted', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_soft_delete(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore(text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete(text, uuid[]) TO authenticated;
