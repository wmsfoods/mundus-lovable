
CREATE TABLE IF NOT EXISTS public.mundus_partners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  partner_type text NOT NULL CHECK (partner_type IN (
    'financial','logistics','insurance','customs_broker',
    'freight_forwarder','cold_storage','port_terminal',
    'inspection','legal','technology','other'
  )),
  country text,
  city text,
  state text,
  address text,
  postal_code text,
  website text,
  logo_url text,
  services_offered text[] DEFAULT '{}',
  coverage_regions text[] DEFAULT '{}',
  notes text,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','pending','archived')),
  partnership_since date,
  owner_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.mundus_partner_contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.mundus_partners(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  mobile text,
  job_title text,
  linkedin text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_type ON public.mundus_partners(partner_type);
CREATE INDEX IF NOT EXISTS idx_partners_country ON public.mundus_partners(country);
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.mundus_partners(status);
CREATE INDEX IF NOT EXISTS idx_partner_contacts_partner ON public.mundus_partner_contacts(partner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mundus_partners TO authenticated;
GRANT ALL ON public.mundus_partners TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mundus_partner_contacts TO authenticated;
GRANT ALL ON public.mundus_partner_contacts TO service_role;

ALTER TABLE public.mundus_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mundus_partner_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mundus admins manage partners" ON public.mundus_partners
  FOR ALL TO authenticated
  USING (public.is_mundus_admin())
  WITH CHECK (public.is_mundus_admin());

CREATE POLICY "Mundus admins manage partner contacts" ON public.mundus_partner_contacts
  FOR ALL TO authenticated
  USING (public.is_mundus_admin())
  WITH CHECK (public.is_mundus_admin());

CREATE TRIGGER trg_mundus_partners_updated_at
  BEFORE UPDATE ON public.mundus_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
