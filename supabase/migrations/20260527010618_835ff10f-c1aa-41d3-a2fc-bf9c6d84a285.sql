CREATE TABLE IF NOT EXISTS public.prospect_phone_reveals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  apollo_person_id text UNIQUE NOT NULL,
  phone text,
  mobile text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prospect_phone_apollo_id
  ON public.prospect_phone_reveals(apollo_person_id);

GRANT SELECT ON public.prospect_phone_reveals TO authenticated;
GRANT ALL ON public.prospect_phone_reveals TO service_role;

ALTER TABLE public.prospect_phone_reveals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospect_phone_reveals_admin_select"
  ON public.prospect_phone_reveals
  FOR SELECT
  TO authenticated
  USING (public.is_mundus_admin());

CREATE POLICY "prospect_phone_reveals_service_all"
  ON public.prospect_phone_reveals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);