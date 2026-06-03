-- Add auto-negotiation opt-in fields to offers
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS negotiation_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS negotiation_dial text NOT NULL DEFAULT 'balanced';

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_negotiation_mode_check,
  DROP CONSTRAINT IF EXISTS offers_negotiation_dial_check;

ALTER TABLE public.offers
  ADD CONSTRAINT offers_negotiation_mode_check CHECK (negotiation_mode IN ('manual','auto')),
  ADD CONSTRAINT offers_negotiation_dial_check CHECK (negotiation_dial IN ('protect_margin','balanced','win_deal'));

-- Snapshot mode/dial onto negotiations at creation
ALTER TABLE public.negotiations
  ADD COLUMN IF NOT EXISTS negotiation_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS negotiation_dial text NOT NULL DEFAULT 'balanced';

ALTER TABLE public.negotiations
  DROP CONSTRAINT IF EXISTS negotiations_negotiation_mode_check,
  DROP CONSTRAINT IF EXISTS negotiations_negotiation_dial_check;

ALTER TABLE public.negotiations
  ADD CONSTRAINT negotiations_negotiation_mode_check CHECK (negotiation_mode IN ('manual','auto')),
  ADD CONSTRAINT negotiations_negotiation_dial_check CHECK (negotiation_dial IN ('protect_margin','balanced','win_deal'));

-- Trigger: snapshot negotiation_mode/dial from parent offer at INSERT time
CREATE OR REPLACE FUNCTION public.tg_negotiations_snapshot_mode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mode text;
  v_dial text;
BEGIN
  SELECT negotiation_mode, negotiation_dial
    INTO v_mode, v_dial
    FROM public.offers
   WHERE id = NEW.offer_id;
  IF v_mode IS NOT NULL THEN NEW.negotiation_mode := v_mode; END IF;
  IF v_dial IS NOT NULL THEN NEW.negotiation_dial := v_dial; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_negotiations_snapshot_mode ON public.negotiations;
CREATE TRIGGER trg_negotiations_snapshot_mode
BEFORE INSERT ON public.negotiations
FOR EACH ROW
EXECUTE FUNCTION public.tg_negotiations_snapshot_mode();
