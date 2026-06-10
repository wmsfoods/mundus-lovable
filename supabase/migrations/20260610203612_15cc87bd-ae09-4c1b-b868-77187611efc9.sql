CREATE TABLE IF NOT EXISTS public.agrostats_report_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  payload jsonb not null,
  refreshed_at timestamptz not null default now()
);

GRANT SELECT ON public.agrostats_report_cache TO authenticated;
GRANT ALL ON public.agrostats_report_cache TO service_role;

ALTER TABLE public.agrostats_report_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read report cache"
ON public.agrostats_report_cache
FOR SELECT
TO authenticated
USING (public.is_mundus_admin());

CREATE INDEX IF NOT EXISTS agrostats_report_cache_refreshed_at_idx
  ON public.agrostats_report_cache(refreshed_at DESC);