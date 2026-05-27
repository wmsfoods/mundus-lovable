ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS revenue_status text NOT NULL DEFAULT 'in_progress';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_revenue_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_revenue_status_check
  CHECK (revenue_status IN ('due', 'exempt', 'in_progress'));