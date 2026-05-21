ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS buyer_message TEXT;
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS supplier_message TEXT;