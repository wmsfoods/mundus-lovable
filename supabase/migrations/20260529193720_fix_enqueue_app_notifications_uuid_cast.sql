-- Fix enqueue_app_notifications: column related_id is uuid but parameter is text,
-- so every call failed at INSERT time and no in-app notifications were stored.
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
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  inserted_count integer := 0;
  v_related_uuid uuid := NULL;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  IF p_related_id IS NOT NULL AND length(trim(p_related_id)) > 0 THEN
    BEGIN
      v_related_uuid := p_related_id::uuid;
    EXCEPTION WHEN others THEN
      v_related_uuid := NULL;
    END;
  END IF;

  INSERT INTO public.app_notifications
    (user_id, company_id, title, body, icon, category, link_url, link_label, related_type, related_id)
  SELECT uid, p_company_id, p_title, p_body, p_icon, p_category, p_link_url, p_link_label, p_related_type, v_related_uuid
  FROM unnest(p_user_ids) AS uid
  WHERE uid IS NOT NULL;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$function$;
