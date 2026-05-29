CREATE OR REPLACE FUNCTION public.enqueue_app_notifications(
  p_user_ids uuid[],
  p_company_id uuid,
  p_title text,
  p_body text DEFAULT NULL,
  p_icon text DEFAULT 'bell',
  p_category text DEFAULT 'system',
  p_link_url text DEFAULT NULL,
  p_link_label text DEFAULT NULL,
  p_related_type text DEFAULT NULL,
  p_related_id text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.app_notifications
    (user_id, company_id, title, body, icon, category, link_url, link_label, related_type, related_id)
  SELECT uid, p_company_id, p_title, p_body, p_icon, p_category, p_link_url, p_link_label, p_related_type, p_related_id
  FROM unnest(p_user_ids) AS uid
  WHERE uid IS NOT NULL;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_app_notifications(uuid[], uuid, text, text, text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_company_active_user_ids(p_company_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT cu.user_id
  FROM public.company_users cu
  WHERE cu.company_id = p_company_id
    AND cu.user_id IS NOT NULL
    AND (cu.status IS NULL OR cu.status IN ('active','accepted'));
$$;

GRANT EXECUTE ON FUNCTION public.get_company_active_user_ids(uuid) TO authenticated;