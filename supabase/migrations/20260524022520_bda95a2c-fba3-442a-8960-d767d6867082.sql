
CREATE TABLE IF NOT EXISTS public.shipment_containers (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  position int DEFAULT 1,
  container_number text,
  seal_number text,
  bl_number text,
  shipping_line text,
  vessel_name text,
  voyage_number text,
  origin_port_id uuid REFERENCES public.ports(id),
  destination_port_id uuid REFERENCES public.ports(id),
  origin_port text,
  destination_port text,
  origin_country text,
  destination_country text,
  stuffed_date timestamptz,
  gate_in_date timestamptz,
  vessel_loaded_date timestamptz,
  departed_date timestamptz,
  arrived_date timestamptz,
  discharged_date timestamptz,
  gate_out_date timestamptz,
  delivered_date timestamptz,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_containers_order ON public.shipment_containers(order_id);

ALTER TABLE public.shipment_containers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shipment_containers_public_all" ON public.shipment_containers;
CREATE POLICY "shipment_containers_public_all"
  ON public.shipment_containers
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.tg_shipment_containers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shipment_containers_updated_at ON public.shipment_containers;
CREATE TRIGGER trg_shipment_containers_updated_at
BEFORE UPDATE ON public.shipment_containers
FOR EACH ROW EXECUTE FUNCTION public.tg_shipment_containers_updated_at();
