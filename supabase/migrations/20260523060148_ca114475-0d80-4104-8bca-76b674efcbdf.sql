ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.companies(id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_office ON public.crm_contacts(office_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.companies(id);
CREATE INDEX IF NOT EXISTS idx_orders_office ON public.orders(office_id);

ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.companies(id);
CREATE INDEX IF NOT EXISTS idx_negotiations_office ON public.negotiations(office_id);