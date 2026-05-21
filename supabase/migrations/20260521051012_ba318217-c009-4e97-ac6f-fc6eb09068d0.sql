ALTER TABLE public.crm_companies DROP CONSTRAINT IF EXISTS crm_companies_stage_check;
ALTER TABLE public.crm_companies ADD CONSTRAINT crm_companies_stage_check 
  CHECK (stage IN ('cold','warm','contacted','qualified','demo_scheduled','demo_done','onboarding','onboarded','active','lost'));

CREATE TABLE IF NOT EXISTS public.crm_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_company_id UUID NOT NULL REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  interview_date DATE,
  duration_minutes INTEGER,
  conducted_by TEXT,
  pain_points TEXT,
  key_quotes TEXT,
  takeaways TEXT,
  next_steps TEXT,
  recording_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  theme TEXT NOT NULL,
  insight TEXT NOT NULL,
  source_company_ids UUID[] NOT NULL DEFAULT '{}',
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_meeting_preps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_company_id UUID NOT NULL REFERENCES public.crm_companies(id) ON DELETE CASCADE,
  crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','ready','failed')),
  company_research TEXT,
  contact_profile TEXT,
  market_context TEXT,
  likely_pain_points TEXT,
  talking_points TEXT,
  strategic_questions TEXT,
  mundus_value_props TEXT,
  research_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  full_brief_md TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_meeting_preps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crm_interviews_public_all" ON public.crm_interviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_learnings_public_all" ON public.crm_learnings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_meeting_preps_public_all" ON public.crm_meeting_preps FOR ALL USING (true) WITH CHECK (true);