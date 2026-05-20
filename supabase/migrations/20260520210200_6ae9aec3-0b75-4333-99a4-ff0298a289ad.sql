
-- ============ Company profile tables ============

-- 1. company_about (1:1)
CREATE TABLE public.company_about (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  description TEXT,
  trade_name TEXT,
  logo_text TEXT,
  trade_markets TEXT[] DEFAULT '{}',
  main_species TEXT[] DEFAULT '{}',
  years_exporting INT,
  fcls_delivered INT,
  countries_served INT,
  member_since INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. company_plants
CREATE TABLE public.company_plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  country_code TEXT,
  capacity TEXT,
  certifications TEXT[] DEFAULT '{}',
  vet_registrations TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_plants_company ON public.company_plants(company_id);

-- 3. company_certifications
CREATE TABLE public.company_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT,
  valid_until DATE,
  certificate_url TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_certs_company ON public.company_certifications(company_id);

-- 4. company_documents
CREATE TABLE public.company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'Other',
  name TEXT NOT NULL,
  file_url TEXT,
  file_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_docs_company ON public.company_documents(company_id);

-- 5. company_team_members
CREATE TABLE public.company_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  whatsapp TEXT,
  photo_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_team_company ON public.company_team_members(company_id);

-- 6. company_preferences (1:1)
CREATE TABLE public.company_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  default_incoterm TEXT,
  default_payment_terms TEXT,
  currencies TEXT[] DEFAULT '{}',
  lead_time TEXT,
  fcl_size TEXT,
  origin_ports TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Enable RLS ============
ALTER TABLE public.company_about ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_preferences ENABLE ROW LEVEL SECURITY;

-- ============ Policies: admin all + members on their own company ============
-- Macro: for each table, admin_all + member_all (own company)

CREATE POLICY "company_about_admin_all" ON public.company_about
  FOR ALL TO authenticated USING (is_mundus_admin()) WITH CHECK (is_mundus_admin());
CREATE POLICY "company_about_member_all" ON public.company_about
  FOR ALL TO authenticated USING (company_id = current_user_company_id())
  WITH CHECK (company_id = current_user_company_id());

CREATE POLICY "company_plants_admin_all" ON public.company_plants
  FOR ALL TO authenticated USING (is_mundus_admin()) WITH CHECK (is_mundus_admin());
CREATE POLICY "company_plants_member_all" ON public.company_plants
  FOR ALL TO authenticated USING (company_id = current_user_company_id())
  WITH CHECK (company_id = current_user_company_id());

CREATE POLICY "company_certs_admin_all" ON public.company_certifications
  FOR ALL TO authenticated USING (is_mundus_admin()) WITH CHECK (is_mundus_admin());
CREATE POLICY "company_certs_member_all" ON public.company_certifications
  FOR ALL TO authenticated USING (company_id = current_user_company_id())
  WITH CHECK (company_id = current_user_company_id());

CREATE POLICY "company_docs_admin_all" ON public.company_documents
  FOR ALL TO authenticated USING (is_mundus_admin()) WITH CHECK (is_mundus_admin());
CREATE POLICY "company_docs_member_all" ON public.company_documents
  FOR ALL TO authenticated USING (company_id = current_user_company_id())
  WITH CHECK (company_id = current_user_company_id());

CREATE POLICY "company_team_admin_all" ON public.company_team_members
  FOR ALL TO authenticated USING (is_mundus_admin()) WITH CHECK (is_mundus_admin());
CREATE POLICY "company_team_member_all" ON public.company_team_members
  FOR ALL TO authenticated USING (company_id = current_user_company_id())
  WITH CHECK (company_id = current_user_company_id());

CREATE POLICY "company_prefs_admin_all" ON public.company_preferences
  FOR ALL TO authenticated USING (is_mundus_admin()) WITH CHECK (is_mundus_admin());
CREATE POLICY "company_prefs_member_all" ON public.company_preferences
  FOR ALL TO authenticated USING (company_id = current_user_company_id())
  WITH CHECK (company_id = current_user_company_id());

-- ============ updated_at triggers ============
CREATE TRIGGER trg_company_about_updated BEFORE UPDATE ON public.company_about
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_company_plants_updated BEFORE UPDATE ON public.company_plants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_company_certs_updated BEFORE UPDATE ON public.company_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_company_docs_updated BEFORE UPDATE ON public.company_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_company_team_updated BEFORE UPDATE ON public.company_team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_company_prefs_updated BEFORE UPDATE ON public.company_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-files', 'company-files', true)
ON CONFLICT (id) DO NOTHING;

-- Public read; authenticated uploads/updates/deletes scoped by folder = company_id; admin all
CREATE POLICY "company_files_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-files');

CREATE POLICY "company_files_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'company-files' AND is_mundus_admin())
  WITH CHECK (bucket_id = 'company-files' AND is_mundus_admin());

CREATE POLICY "company_files_member_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-files'
    AND (storage.foldername(name))[1] = current_user_company_id()::text
  );

CREATE POLICY "company_files_member_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-files'
    AND (storage.foldername(name))[1] = current_user_company_id()::text
  );

CREATE POLICY "company_files_member_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-files'
    AND (storage.foldername(name))[1] = current_user_company_id()::text
  );
