-- Office-related columns on companies
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS parent_company_id UUID REFERENCES public.companies(id),
  ADD COLUMN IF NOT EXISTS office_type TEXT DEFAULT 'headquarters' CHECK (office_type IN ('headquarters', 'regional_office', 'branch')),
  ADD COLUMN IF NOT EXISTS office_name TEXT,
  ADD COLUMN IF NOT EXISTS office_country TEXT,
  ADD COLUMN IF NOT EXISTS office_region TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_parent ON public.companies(parent_company_id);

-- user_offices junction table
CREATE TABLE IF NOT EXISTS public.user_offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('office_admin', 'member')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_offices_user ON public.user_offices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_offices_company ON public.user_offices(company_id);

ALTER TABLE public.user_offices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own offices" ON public.user_offices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage offices" ON public.user_offices
  FOR ALL TO authenticated
  USING (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE id = public.current_user_company_id() 
         OR parent_company_id = public.current_user_company_id()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies 
      WHERE id = public.current_user_company_id() 
         OR parent_company_id = public.current_user_company_id()
    )
  );

-- active_office_id on users (project uses users table, not profiles)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_office_id UUID REFERENCES public.companies(id);

-- office_id on offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.companies(id);