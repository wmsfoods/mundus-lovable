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

  -- Block if there is meaningful business activity
  SELECT public.get_company_delete_blockers(p_company_id) INTO v_blockers;
  IF NOT (v_blockers->>'can_delete')::boolean THEN
    RAISE EXCEPTION 'company_has_dependencies: %', v_blockers::text;
  END IF;

  -- Detach references that don't cascade automatically
  UPDATE public.users SET active_company_id = NULL WHERE active_company_id = p_company_id AND company_id <> p_company_id;
  UPDATE public.users SET active_office_id = NULL WHERE active_office_id = p_company_id AND company_id <> p_company_id;
  UPDATE public.crm_contacts SET office_id = NULL WHERE office_id = p_company_id;
  UPDATE public.buyer_requests SET assigned_office_id = NULL WHERE assigned_office_id = p_company_id;
  UPDATE public.buyer_requests SET target_supplier_id = NULL WHERE target_supplier_id = p_company_id;
  UPDATE public.user_requests SET invited_by_office_id = NULL WHERE invited_by_office_id = p_company_id;
  UPDATE public.user_requests SET approved_company_id = NULL WHERE approved_company_id = p_company_id;
  UPDATE public.companies SET parent_company_id = NULL WHERE parent_company_id = p_company_id;

  -- Collect users belonging to this company, then delete them (no orders/offers possible since blockers passed)
  SELECT array_agg(id) INTO v_user_ids FROM public.users WHERE company_id = p_company_id;

  IF v_user_ids IS NOT NULL THEN
    DELETE FROM public.user_requests WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.notifications WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.app_notifications WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.device_push_tokens WHERE user_id = ANY(v_user_ids);
    DELETE FROM public.users WHERE id = ANY(v_user_ids);
    DELETE FROM auth.users WHERE id = ANY(v_user_ids);
  END IF;

  -- Finally delete the company (most children cascade)
  DELETE FROM public.companies WHERE id = p_company_id;

  RETURN jsonb_build_object('ok', true, 'deleted_users', coalesce(array_length(v_user_ids, 1), 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_hard_delete_company(uuid) TO authenticated;