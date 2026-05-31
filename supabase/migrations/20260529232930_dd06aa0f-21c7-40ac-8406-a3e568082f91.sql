
-- Notification fan-out: DB-side triggers as source of truth
CREATE OR REPLACE FUNCTION public._notify_company(
  p_company_id uuid,
  p_title text,
  p_body text,
  p_icon text,
  p_link_url text,
  p_related_id uuid
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
        (v_uid, p_company_id, p_title, p_body, p_icon, 'negotiations', p_link_url, 'Open', 'negotiation', p_related_id);
    EXCEPTION WHEN foreign_key_violation THEN
      CONTINUE;
    WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;
END;
$$;

-- Trigger 1: round_proposals → bid/counter notifications
CREATE OR REPLACE FUNCTION public.tg_notify_round_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
  v_supplier uuid;
  v_offer_num int;
  v_title text;
  v_body text;
  v_target uuid;
  v_link text;
  v_label text;
BEGIN
  SELECT n.buyer_company_id, o.supplier_id, o.offer_number
    INTO v_buyer, v_supplier, v_offer_num
    FROM public.negotiations n
    JOIN public.offers o ON o.id = n.offer_id
   WHERE n.id = NEW.negotiation_id;

  v_label := COALESCE('M-' || v_offer_num::text, 'offer');

  IF COALESCE(NEW.side, 'buyer') = 'buyer' THEN
    v_target := v_supplier;
    v_link := '/supplier/negotiations/' || NEW.negotiation_id::text;
    IF NEW.round = 1 THEN
      v_title := 'New bid received';
      v_body := 'A buyer placed a bid on ' || v_label;
    ELSE
      v_title := 'New bid received';
      v_body := 'Buyer sent a new bid on ' || v_label || ' (round ' || NEW.round || ')';
    END IF;
  ELSE
    v_target := v_buyer;
    v_link := '/buyer/negotiations/' || NEW.negotiation_id::text;
    v_title := 'Counter-offer received';
    v_body := 'Supplier sent a counter on ' || v_label || ' (round ' || NEW.round || ')';
  END IF;

  PERFORM public._notify_company(v_target, v_title, v_body, 'dollar', v_link, NEW.negotiation_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_round_proposal ON public.round_proposals;
CREATE TRIGGER trg_notify_round_proposal
AFTER INSERT ON public.round_proposals
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_round_proposal();

-- Trigger 2: negotiations status transitions
CREATE OR REPLACE FUNCTION public.tg_notify_negotiation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier uuid;
  v_offer_num int;
  v_label text;
  v_counterparty uuid;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;

  SELECT o.supplier_id, o.offer_number INTO v_supplier, v_offer_num
    FROM public.offers o WHERE o.id = NEW.offer_id;

  v_label := COALESCE('M-' || v_offer_num::text, 'offer');

  IF NEW.status = 'pending_confirmation' THEN
    -- Counterparty = side that did NOT accept
    IF NEW.accepted_by = 'buyer' THEN
      PERFORM public._notify_company(v_supplier,
        'Buyer accepted — confirm the deal',
        v_label || ' is awaiting your confirmation',
        'check',
        '/supplier/negotiations/' || NEW.id::text,
        NEW.id);
    ELSIF NEW.accepted_by = 'supplier' THEN
      PERFORM public._notify_company(NEW.buyer_company_id,
        'Supplier accepted — confirm the deal',
        v_label || ' is awaiting your confirmation',
        'check',
        '/buyer/negotiations/' || NEW.id::text,
        NEW.id);
    END IF;
  ELSIF NEW.status = 'bid_accepted' THEN
    PERFORM public._notify_company(v_supplier,
      '🎉 Deal closed',
      v_label || ' — order created',
      'check',
      '/supplier/negotiations/' || NEW.id::text,
      NEW.id);
    PERFORM public._notify_company(NEW.buyer_company_id,
      '🎉 Deal closed',
      v_label || ' — order created',
      'check',
      '/buyer/negotiations/' || NEW.id::text,
      NEW.id);
  ELSIF NEW.status = 'offer_rejected' THEN
    PERFORM public._notify_company(v_supplier,
      'Negotiation rejected',
      v_label || ' was rejected',
      'alert',
      '/supplier/negotiations/' || NEW.id::text,
      NEW.id);
    PERFORM public._notify_company(NEW.buyer_company_id,
      'Negotiation rejected',
      v_label || ' was rejected',
      'alert',
      '/buyer/negotiations/' || NEW.id::text,
      NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_negotiation_status ON public.negotiations;
CREATE TRIGGER trg_notify_negotiation_status
AFTER UPDATE OF status ON public.negotiations
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_negotiation_status();

-- Trigger 3: chat proposals accepted / confirmed
CREATE OR REPLACE FUNCTION public.tg_notify_chat_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
  v_supplier uuid;
  v_offer_num int;
  v_label text;
  v_proposer_company uuid;
BEGIN
  IF NEW.message_type <> 'proposal' THEN RETURN NEW; END IF;
  IF NEW.proposal_status IS NOT DISTINCT FROM OLD.proposal_status THEN RETURN NEW; END IF;

  SELECT n.buyer_company_id, o.supplier_id, o.offer_number
    INTO v_buyer, v_supplier, v_offer_num
    FROM public.negotiations n
    JOIN public.offers o ON o.id = n.offer_id
   WHERE n.id = NEW.negotiation_id;

  v_label := COALESCE('M-' || v_offer_num::text, 'chat proposal');

  -- Determine proposer company (best-effort)
  SELECT company_id INTO v_proposer_company FROM public.company_users
   WHERE user_id = NEW.sender_user_id
     AND company_id IN (v_buyer, v_supplier)
     AND COALESCE(status,'active') = 'active'
   LIMIT 1;

  IF NEW.proposal_status = 'accepted_pending_confirmation' THEN
    -- Notify proposer to confirm
    PERFORM public._notify_company(v_proposer_company,
      'Chat proposal accepted — confirm to close',
      v_label,
      'check',
      CASE WHEN v_proposer_company = v_supplier
           THEN '/supplier/negotiations/' || NEW.negotiation_id::text
           ELSE '/buyer/negotiations/' || NEW.negotiation_id::text END,
      NEW.negotiation_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_chat_proposal ON public.negotiation_messages;
CREATE TRIGGER trg_notify_chat_proposal
AFTER UPDATE ON public.negotiation_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_chat_proposal();
