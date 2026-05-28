
-- Address-book style locations attached to a company (NOT a separate company)
CREATE TABLE IF NOT EXISTS public.company_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_type text NOT NULL DEFAULT 'office', -- 'office' | 'factory' | 'warehouse'
  name text,
  address text,
  city text,
  state text,
  country text,
  zip_code text,
  est_number text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_locations TO authenticated;
GRANT ALL ON public.company_locations TO service_role;

ALTER TABLE public.company_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loc_select" ON public.company_locations FOR SELECT TO authenticated
  USING (public.is_mundus_admin() OR company_id IN (SELECT public.current_user_company_ids()));

CREATE POLICY "loc_insert" ON public.company_locations FOR INSERT TO authenticated
  WITH CHECK (public.is_mundus_admin() OR company_id IN (SELECT public.current_user_company_ids()));

CREATE POLICY "loc_update" ON public.company_locations FOR UPDATE TO authenticated
  USING (public.is_mundus_admin() OR company_id IN (SELECT public.current_user_company_ids()))
  WITH CHECK (public.is_mundus_admin() OR company_id IN (SELECT public.current_user_company_ids()));

CREATE POLICY "loc_delete" ON public.company_locations FOR DELETE TO authenticated
  USING (public.is_mundus_admin() OR company_id IN (SELECT public.current_user_company_ids()));

CREATE INDEX IF NOT EXISTS idx_company_locations_company ON public.company_locations(company_id);

CREATE TRIGGER company_locations_updated_at
  BEFORE UPDATE ON public.company_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
