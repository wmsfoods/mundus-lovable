ALTER TABLE public.cuts ADD COLUMN IF NOT EXISTS unit_weight text NOT NULL DEFAULT 'Kg';
ALTER TABLE public.cuts DROP CONSTRAINT IF EXISTS cuts_unit_weight_check;
ALTER TABLE public.cuts ADD CONSTRAINT cuts_unit_weight_check CHECK (unit_weight IN ('Kg','Lb'));
UPDATE public.cuts SET unit_weight = 'Kg' WHERE unit_weight IS NULL OR unit_weight NOT IN ('Kg','Lb');