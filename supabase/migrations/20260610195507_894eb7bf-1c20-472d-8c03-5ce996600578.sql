
CREATE TABLE IF NOT EXISTS public.agrostats_schema_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payload jsonb NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agrostats_schema_cache TO authenticated;
GRANT ALL ON public.agrostats_schema_cache TO service_role;
ALTER TABLE public.agrostats_schema_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read agrostats schema cache"
  ON public.agrostats_schema_cache FOR SELECT TO authenticated
  USING (public.is_mundus_admin());

CREATE TABLE IF NOT EXISTS public.agrostats_saved_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  payload jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agrostats_saved_queries TO authenticated;
GRANT ALL ON public.agrostats_saved_queries TO service_role;
ALTER TABLE public.agrostats_saved_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read saved agrostats queries"
  ON public.agrostats_saved_queries FOR SELECT TO authenticated
  USING (public.is_mundus_admin());
CREATE POLICY "Admins can insert saved agrostats queries"
  ON public.agrostats_saved_queries FOR INSERT TO authenticated
  WITH CHECK (public.is_mundus_admin() AND created_by = auth.uid());
CREATE POLICY "Admins can delete saved agrostats queries"
  ON public.agrostats_saved_queries FOR DELETE TO authenticated
  USING (public.is_mundus_admin());
