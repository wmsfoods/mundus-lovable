ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS rejection_notes TEXT;