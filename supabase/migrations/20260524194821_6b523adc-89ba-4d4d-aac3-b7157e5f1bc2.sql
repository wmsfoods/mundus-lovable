ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_company_id uuid REFERENCES public.companies(id);

UPDATE public.orders o
SET buyer_company_id = u.company_id
FROM public.users u
WHERE u.id = o.buyer_id AND o.buyer_company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_buyer_company_id ON public.orders(buyer_company_id);