
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
  -- Determine "published" transition
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
  v_body := COALESCE(NEW.product_name, 'Request') || ' → ' || COALESCE(NEW.destination_country, '—');
  v_link := '/supplier/requests/' || NEW.id::text;

  -- Parse categories (comma-separated text)
  v_categories := ARRAY(
    SELECT trim(x) FROM unnest(string_to_array(COALESCE(NEW.category, ''), ',')) AS x
    WHERE trim(x) <> ''
  );

  -- Branch A: targeted to specific supplier(s)
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
        PERFORM public._notify_company(v_company_id, v_title, v_body, 'bell', v_link, NEW.id);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END LOOP;

    RETURN NEW;
  END IF;

  -- Branch B: marketplace — notify suppliers with matching protein profile
  IF cardinality(v_categories) = 0 THEN
    RETURN NEW; -- no protein to match
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
      PERFORM public._notify_company(v_company_id, v_title, v_body, 'bell', v_link, NEW.id);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_buyer_request_published_ins ON public.buyer_requests;
CREATE TRIGGER trg_notify_buyer_request_published_ins
  AFTER INSERT ON public.buyer_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_buyer_request_published();

DROP TRIGGER IF EXISTS trg_notify_buyer_request_published_upd ON public.buyer_requests;
CREATE TRIGGER trg_notify_buyer_request_published_upd
  AFTER UPDATE OF status ON public.buyer_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_notify_buyer_request_published();
