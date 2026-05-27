
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_revenue_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_revenue_status_check
  CHECK (revenue_status IN ('in_progress','exempt','due','invoiced','received','cancelled'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS revenue_cancel_reason text,
  ADD COLUMN IF NOT EXISTS revenue_cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS revenue_status_changed_at timestamptz;
