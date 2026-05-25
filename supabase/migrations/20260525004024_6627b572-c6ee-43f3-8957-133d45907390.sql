ALTER TABLE public.buyer_requests
  ADD COLUMN IF NOT EXISTS target_supplier_id uuid REFERENCES public.companies(id);

CREATE INDEX IF NOT EXISTS idx_buyer_requests_target_supplier
  ON public.buyer_requests(target_supplier_id);