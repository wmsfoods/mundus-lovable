CREATE TABLE IF NOT EXISTS public.agrostats_panel_cache (
  cache_key text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

GRANT ALL ON public.agrostats_panel_cache TO service_role;

ALTER TABLE public.agrostats_panel_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read panel cache"
ON public.agrostats_panel_cache
FOR SELECT
TO authenticated
USING (public.is_mundus_admin());

CREATE INDEX IF NOT EXISTS agrostats_panel_cache_created_at_idx
  ON public.agrostats_panel_cache(created_at DESC);