CREATE TABLE public.offer_origin_ports (
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  port_id uuid NOT NULL REFERENCES public.ports(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (offer_id, port_id)
);

CREATE INDEX idx_offer_origin_ports_offer ON public.offer_origin_ports(offer_id);
CREATE INDEX idx_offer_origin_ports_port ON public.offer_origin_ports(port_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_origin_ports TO authenticated;
GRANT SELECT ON public.offer_origin_ports TO anon;
GRANT ALL ON public.offer_origin_ports TO service_role;

ALTER TABLE public.offer_origin_ports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offer_origin_ports_select_all"
ON public.offer_origin_ports
FOR SELECT
USING (true);

CREATE POLICY "offer_origin_ports_insert_supplier"
ON public.offer_origin_ports
FOR INSERT
TO authenticated
WITH CHECK (
  is_mundus_admin() OR EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_origin_ports.offer_id
      AND o.supplier_id IN (SELECT user_supplier_scope_ids())
  )
);

CREATE POLICY "offer_origin_ports_delete_supplier"
ON public.offer_origin_ports
FOR DELETE
TO authenticated
USING (
  is_mundus_admin() OR EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_origin_ports.offer_id
      AND o.supplier_id IN (SELECT user_supplier_scope_ids())
  )
);