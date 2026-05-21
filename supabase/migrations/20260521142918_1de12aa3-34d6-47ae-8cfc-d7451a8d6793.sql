-- Enums
CREATE TYPE auction_status AS ENUM ('scheduled', 'open', 'closed', 'awarded', 'contracted', 'cancelled', 'expired');
CREATE TYPE auction_visibility AS ENUM ('blind', 'open');
CREATE TYPE auction_bid_status AS ENUM ('submitted', 'winning', 'lost', 'withdrawn');

-- Sequence for opp number
CREATE SEQUENCE auction_opp_seq START 1;

-- Auctions table
CREATE TABLE public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opp_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  supplier_id UUID REFERENCES public.users(id),
  company_id UUID REFERENCES public.companies(id),
  commodity TEXT NOT NULL CHECK (commodity IN ('Beef','Pork','Poultry','Ovine')),
  cuts JSONB DEFAULT '[]',
  temperature TEXT CHECK (temperature IN ('Frozen','Chilled')),
  container_size TEXT CHECK (container_size IN ('20ft','40ft')),
  container_count INTEGER DEFAULT 1,
  available_containers INTEGER DEFAULT 1,
  origin_country_id UUID REFERENCES public.countries(id),
  origin_port_id UUID REFERENCES public.ports(id),
  destination_markets JSONB DEFAULT '[]',
  incoterms TEXT[] DEFAULT '{}',
  primary_incoterm TEXT,
  inco_adjustments JSONB DEFAULT '{}',
  shipment_period TEXT,
  payment_terms TEXT,
  auction_opens_at TIMESTAMPTZ NOT NULL,
  auction_closes_at TIMESTAMPTZ NOT NULL,
  reserve_price_per_kg NUMERIC,
  min_bid_per_kg NUMERIC,
  status auction_status DEFAULT 'scheduled',
  visibility auction_visibility DEFAULT 'blind',
  decision_deadline_hours INTEGER DEFAULT 24,
  awarded_bid_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto opp_number trigger
CREATE OR REPLACE FUNCTION public.generate_auction_opp_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.opp_number := 'MDS-A#' || LPAD(nextval('auction_opp_seq')::text, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auction_opp_number
BEFORE INSERT ON public.auctions
FOR EACH ROW WHEN (NEW.opp_number IS NULL)
EXECUTE FUNCTION public.generate_auction_opp_number();

CREATE TRIGGER trg_auctions_updated_at
BEFORE UPDATE ON public.auctions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Bids table
CREATE TABLE public.auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID REFERENCES public.users(id),
  company_id UUID REFERENCES public.companies(id),
  bid_prices JSONB NOT NULL,
  volume_containers INTEGER DEFAULT 1,
  total_value_usd NUMERIC,
  payment_terms TEXT,
  notes TEXT,
  bid_locked_until TIMESTAMPTZ,
  withdrawal_at TIMESTAMPTZ,
  cooldown_until TIMESTAMPTZ,
  commitment_acknowledged BOOLEAN DEFAULT false,
  bid_rank INTEGER,
  is_winner BOOLEAN DEFAULT false,
  status auction_bid_status DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_auction_bids_updated_at
BEFORE UPDATE ON public.auction_bids
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_closes_at ON public.auctions(auction_closes_at);
CREATE INDEX idx_auction_bids_auction ON public.auction_bids(auction_id);
CREATE INDEX idx_auction_bids_bidder ON public.auction_bids(bidder_id);

-- RLS
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read auctions"
ON public.auctions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Supplier company can insert auctions"
ON public.auctions FOR INSERT TO authenticated WITH CHECK (
  company_id = public.current_user_company_id()
);

CREATE POLICY "Supplier company can update own auctions"
ON public.auctions FOR UPDATE TO authenticated USING (
  company_id = public.current_user_company_id()
);

CREATE POLICY "Supplier company can delete own auctions"
ON public.auctions FOR DELETE TO authenticated USING (
  company_id = public.current_user_company_id()
);

-- Bids: bidder sees own bids
CREATE POLICY "Bidder sees own bids"
ON public.auction_bids FOR SELECT TO authenticated USING (
  bidder_id = auth.uid()
);

-- Supplier sees bids after close
CREATE POLICY "Supplier sees bids after close"
ON public.auction_bids FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.auctions a
    WHERE a.id = auction_id
      AND a.company_id = public.current_user_company_id()
      AND a.auction_closes_at < now()
  )
);

CREATE POLICY "Bidder can insert own bid"
ON public.auction_bids FOR INSERT TO authenticated WITH CHECK (
  bidder_id = auth.uid()
);

CREATE POLICY "Bidder can update own bid"
ON public.auction_bids FOR UPDATE TO authenticated USING (
  bidder_id = auth.uid()
);