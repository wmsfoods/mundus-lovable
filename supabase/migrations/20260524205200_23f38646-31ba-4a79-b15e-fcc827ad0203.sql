CREATE TABLE public.buyer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number serial,
  buyer_company_id uuid NOT NULL REFERENCES public.companies(id),
  buyer_user_id uuid,
  product_name text NOT NULL,
  category text,
  specification text,
  destination_country text NOT NULL,
  destination_port text,
  incoterm text,
  container_size text DEFAULT '40ft',
  container_count int DEFAULT 1,
  quantity_kg numeric NOT NULL,
  temperature text DEFAULT 'Frozen',
  target_price_usd numeric,
  shipment_date text,
  additional_info text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE public.buyer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_requests_public_all" ON public.buyer_requests
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_buyer_requests_company ON public.buyer_requests(buyer_company_id);
CREATE INDEX idx_buyer_requests_status ON public.buyer_requests(status);

CREATE TRIGGER buyer_requests_updated_at
  BEFORE UPDATE ON public.buyer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.buyer_requests(id);
