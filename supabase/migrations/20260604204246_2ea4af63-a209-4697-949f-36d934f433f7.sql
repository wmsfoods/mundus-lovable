CREATE OR REPLACE FUNCTION public.enforce_floor_le_ask()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.minimum_price IS NOT NULL
     AND NEW.price IS NOT NULL
     AND NEW.minimum_price > NEW.price THEN
    RAISE EXCEPTION 'minimum_price (%) cannot exceed price (%)', NEW.minimum_price, NEW.price
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_floor_le_ask ON public.offer_items;
CREATE TRIGGER trg_enforce_floor_le_ask
BEFORE INSERT OR UPDATE ON public.offer_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_floor_le_ask();