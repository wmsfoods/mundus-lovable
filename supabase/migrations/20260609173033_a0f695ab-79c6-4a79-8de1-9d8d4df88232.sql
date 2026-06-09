
CREATE OR REPLACE FUNCTION public._notify_company(
  p_company_id uuid,
  p_title text,
  p_body text,
  p_icon text,
  p_link_url text,
  p_related_id uuid,
  p_category text DEFAULT 'negotiations',
  p_related_type text DEFAULT 'negotiation'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  IF p_company_id IS NULL THEN RETURN; END IF;
  FOR v_uid IN
    SELECT DISTINCT cu.user_id
      FROM public.company_users cu
     WHERE cu.company_id = p_company_id
       AND cu.user_id IS NOT NULL
       AND (cu.status IS NULL OR cu.status IN ('active','accepted'))
  LOOP
    BEGIN
      INSERT INTO public.app_notifications
        (user_id, company_id, title, body, icon, category, link_url, link_label, related_type, related_id)
      VALUES
        (v_uid, p_company_id, p_title, p_body, p_icon, p_category, p_link_url, 'Open', p_related_type, p_related_id);
    EXCEPTION WHEN foreign_key_violation THEN
      CONTINUE;
    WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_notify_buyer_request_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_published_now boolean;
  v_categories text[];
  v_targets uuid[];
  v_company_id uuid;
  v_title text;
  v_body text;
  v_link text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_published_now := COALESCE(NEW.status, '') NOT IN ('draft', 'cancelled', 'archived');
  ELSE
    v_published_now := COALESCE(NEW.status, '') NOT IN ('draft', 'cancelled', 'archived')
                       AND COALESCE(OLD.status, '') IN ('draft');
  END IF;

  IF NOT v_published_now THEN
    RETURN NEW;
  END IF;

  v_title := 'New buyer request';
  v_body := COALESCE(NEW.product_name, 'Request') || ' -> ' || COALESCE(NEW.destination_country, '-');
  v_link := '/supplier/requests/' || NEW.id::text;

  v_categories := ARRAY(
    SELECT trim(x) FROM unnest(string_to_array(COALESCE(NEW.category, ''), ',')) AS x
    WHERE trim(x) <> ''
  );

  IF NEW.target_supplier_id IS NOT NULL
     OR (NEW.target_supplier_ids IS NOT NULL AND cardinality(NEW.target_supplier_ids) > 0) THEN
    v_targets := ARRAY[]::uuid[];
    IF NEW.target_supplier_id IS NOT NULL THEN
      v_targets := array_append(v_targets, NEW.target_supplier_id);
    END IF;
    IF NEW.target_supplier_ids IS NOT NULL THEN
      v_targets := v_targets || NEW.target_supplier_ids;
    END IF;

    FOR v_company_id IN
      SELECT DISTINCT t FROM unnest(v_targets) AS t WHERE t IS NOT NULL
    LOOP
      BEGIN
        PERFORM public._notify_company(v_company_id, v_title, v_body, 'bell', v_link, NEW.id, 'requests', 'buyer_request');
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END LOOP;

    RETURN NEW;
  END IF;

  IF cardinality(v_categories) = 0 THEN
    RETURN NEW;
  END IF;

  FOR v_company_id IN
    SELECT c.id
      FROM public.companies c
     WHERE c.is_supplier = true
       AND c.deleted_at IS NULL
       AND c.protein_profiles IS NOT NULL
       AND c.protein_profiles && v_categories
  LOOP
    BEGIN
      PERFORM public._notify_company(v_company_id, v_title, v_body, 'bell', v_link, NEW.id, 'requests', 'buyer_request');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$function$;

UPDATE public.app_notifications
   SET category = 'requests',
       related_type = 'buyer_request'
 WHERE category = 'negotiations'
   AND (link_url LIKE '/supplier/requests/%' OR link_url LIKE '/buyer/requests/%');

UPDATE public.app_notifications
   SET category = 'offers'
 WHERE category = 'offer';
