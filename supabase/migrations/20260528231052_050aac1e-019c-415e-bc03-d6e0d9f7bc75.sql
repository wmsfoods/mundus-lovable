ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS origin_port_id uuid REFERENCES public.ports(id);
ALTER TABLE public.offers ALTER COLUMN origin_country DROP NOT NULL;
ALTER TABLE public.offers ALTER COLUMN origin_port DROP NOT NULL;