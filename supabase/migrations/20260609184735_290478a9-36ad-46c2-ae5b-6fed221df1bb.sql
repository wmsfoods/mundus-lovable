-- Safety net: prevent an offer from being persisted as 'active' without the
-- minimum data required to be live on the marketplace. Uses a deferred
-- constraint trigger so the check runs at COMMIT, after child rows
-- (offer_items, offer_allowed_incoterms, offer_markets, offer_origin_ports,
-- freight_options) have been replaced during an update.

CREATE OR REPLACE FUNCTION public.validate_active_offer_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer public.offers%ROWTYPE;
  v_items INT;
  v_incoterms INT;
  v_markets INT;
  v_origin_ports INT;
  v_needs_freight BOOLEAN;
  v_missing_freight INT;
BEGIN
  SELECT * INTO v_offer FROM public.offers WHERE id = NEW.id;
  IF NOT FOUND OR v_offer.status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF v_offer.payment_terms IS NULL OR length(btrim(v_offer.payment_terms)) = 0 THEN
    RAISE EXCEPTION 'offerIncomplete:payment_terms';
  END IF;

  IF v_offer.origin_port_id IS NULL THEN
    RAISE EXCEPTION 'offerIncomplete:origin_port';
  END IF;

  SELECT count(*) INTO v_items FROM public.offer_items WHERE offer_id = v_offer.id;
  IF v_items = 0 THEN
    RAISE EXCEPTION 'offerIncomplete:items';
  END IF;

  SELECT count(*) INTO v_incoterms FROM public.offer_allowed_incoterms WHERE offer_id = v_offer.id;
  IF v_incoterms = 0 THEN
    RAISE EXCEPTION 'offerIncomplete:incoterms';
  END IF;

  SELECT count(*) INTO v_markets FROM public.offer_markets WHERE offer_id = v_offer.id;
  IF v_markets = 0 THEN
    RAISE EXCEPTION 'offerIncomplete:markets';
  END IF;

  SELECT count(*) INTO v_origin_ports FROM public.offer_origin_ports WHERE offer_id = v_offer.id;
  IF v_origin_ports = 0 THEN
    RAISE EXCEPTION 'offerIncomplete:origin_ports';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.offer_allowed_incoterms
    WHERE offer_id = v_offer.id AND incoterm_type IN ('CFR','CIF')
  ) INTO v_needs_freight;

  IF v_needs_freight THEN
    SELECT count(*) INTO v_missing_freight
    FROM public.freight_options
    WHERE offer_id = v_offer.id AND COALESCE(cost,0) <= 0;
    IF v_missing_freight > 0 THEN
      RAISE EXCEPTION 'offerIncomplete:freight';
    END IF;

    -- Ensure every destination port has a freight row.
    IF EXISTS (
      SELECT 1
      FROM public.offer_markets om
      JOIN public.markets m ON m.id = om.market_id
      JOIN public.ports p ON p.country_id = m.country_id
      WHERE om.offer_id = v_offer.id
    ) AND NOT EXISTS (
      SELECT 1 FROM public.freight_options WHERE offer_id = v_offer.id
    ) THEN
      RAISE EXCEPTION 'offerIncomplete:freight';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offers_validate_active_complete ON public.offers;
CREATE CONSTRAINT TRIGGER offers_validate_active_complete
  AFTER INSERT OR UPDATE OF status ON public.offers
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_active_offer_complete();