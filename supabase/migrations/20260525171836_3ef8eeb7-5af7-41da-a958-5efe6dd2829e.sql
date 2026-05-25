ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS cut_region text NOT NULL DEFAULT 'global';
ALTER TABLE public.buyer_requests ADD COLUMN IF NOT EXISTS cut_region text NOT NULL DEFAULT 'global';