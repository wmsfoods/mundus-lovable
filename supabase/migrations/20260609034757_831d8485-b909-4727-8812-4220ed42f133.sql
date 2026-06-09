
CREATE OR REPLACE FUNCTION public.tg_notify_offer_response_to_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_user_ids uuid[];
  v_link text;
  v_title text;
  v_body text;
  v_product text;
BEGIN
  -- Only fire when offer is active and linked to a buyer_request
  IF NEW.request_id IS NULL OR COALESCE(NEW.status, '') <> 'active' THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only fire when status transitions to active OR request_id newly attached
  IF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.status,'') = 'active'
       AND OLD.request_id IS NOT DISTINCT FROM NEW.request_id THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT buyer_company_id, product_name
    INTO v_request
    FROM public.buyer_requests
   WHERE id = NEW.request_id;

  IF v_request.buyer_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Flip request status (best-effort)
  BEGIN
    UPDATE public.buyer_requests
       SET status = 'with_responses', updated_at = now()
     WHERE id = NEW.request_id
       AND COALESCE(status,'') NOT IN ('with_responses','closed','cancelled','archived');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  v_product := COALESCE(NULLIF(v_request.product_name,''), 'your request');
  v_link := '/buyer/requests/' || NEW.request_id::text;
  v_title := 'Supplier responded to your request';
  v_body := COALESCE(NEW.supplier_name,'A supplier') || ' submitted an offer for ' || v_product;

  -- Collect active recipient user ids
  SELECT array_agg(DISTINCT cu.user_id)
    INTO v_user_ids
    FROM public.company_users cu
   WHERE cu.company_id = v_request.buyer_company_id
     AND cu.user_id IS NOT NULL
     AND (cu.status IS NULL OR cu.status IN ('active','accepted'));

  IF v_user_ids IS NULL OR array_length(v_user_ids,1) IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.enqueue_app_notifications(
      v_user_ids,
      v_request.buyer_company_id,
      v_title,
      v_body,
      'package',
      'requests',
      v_link,
      'Open request',
      'request',
      NEW.request_id::text
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_offer_response_to_request_ins ON public.offers;
DROP TRIGGER IF EXISTS trg_notify_offer_response_to_request_upd ON public.offers;

CREATE TRIGGER trg_notify_offer_response_to_request_ins
AFTER INSERT ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_offer_response_to_request();

CREATE TRIGGER trg_notify_offer_response_to_request_upd
AFTER UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.tg_notify_offer_response_to_request();
