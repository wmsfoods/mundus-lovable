
CREATE TABLE IF NOT EXISTS public.shipping_instructions_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.offers(id),
  buyer_email text NOT NULL,
  buyer_name text,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'not_requested',
  sent_at timestamptz,
  sent_by uuid,
  submitted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_instructions_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "si_requests_public_all" ON public.shipping_instructions_requests FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_si_requests_order ON public.shipping_instructions_requests(order_id);

CREATE TABLE IF NOT EXISTS public.shipping_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.shipping_instructions_requests(id) ON DELETE CASCADE,
  order_id uuid,
  offer_id uuid,
  order_number text,
  buyer_name text,
  buyer_address text,
  port_of_destination text,
  country_of_destination text,
  consignee_name text,
  consignee_address text,
  consignee_phone text,
  consignee_fax text,
  notify_same_as_consignee boolean DEFAULT false,
  notify_name text,
  notify_address text,
  notify_phone text,
  notify_fax text,
  documents_requested jsonb DEFAULT '[]'::jsonb,
  telex_release text,
  approved_shipping_lines jsonb DEFAULT '[]'::jsonb,
  observations text,
  importer_reference text,
  doc_delivery_company text,
  doc_delivery_address text,
  doc_delivery_city text,
  doc_delivery_state text,
  doc_delivery_postal_code text,
  doc_delivery_country text,
  doc_delivery_contact_name text,
  doc_delivery_contact_phone text,
  submitted_at timestamptz,
  submitted_by_ip text,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "si_public_all" ON public.shipping_instructions FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_si_request ON public.shipping_instructions(request_id);

CREATE TRIGGER trg_si_requests_updated_at BEFORE UPDATE ON public.shipping_instructions_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_si_updated_at BEFORE UPDATE ON public.shipping_instructions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
