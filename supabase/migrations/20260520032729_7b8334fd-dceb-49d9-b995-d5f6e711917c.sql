-- CRM v3 structure

-- 1. CRM COMPANIES
CREATE TABLE IF NOT EXISTS crm_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT,
  trade_name TEXT,
  tax_id TEXT,
  company_type TEXT DEFAULT 'prospect' CHECK (company_type IN ('buyer','supplier','both','prospect','competitor','partner')),
  industry TEXT,
  company_category TEXT,
  market_region TEXT,
  product_categories TEXT[] DEFAULT '{}',
  country TEXT,
  state TEXT,
  city TEXT,
  address TEXT,
  postal_code TEXT,
  phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  logo_url TEXT,
  company_size TEXT,
  estimated_employees INT,
  annual_revenue BIGINT,
  founded_year INT,
  apollo_company_id TEXT UNIQUE,
  apollo_enriched_at TIMESTAMPTZ,
  short_description TEXT,
  technologies JSONB DEFAULT '[]',
  keywords TEXT[] DEFAULT '{}',
  stage TEXT DEFAULT 'cold' CHECK (stage IN ('cold','engaged','warm','mql','sql','customer','churned','disqualified')),
  owner_id UUID REFERENCES users(id),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','wms_import','apollo','csv_import','website','referral','trade_show','inbound','linkedin')),
  source_detail TEXT,
  mundus_company_id UUID,
  wms_company_name TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','archived','merged')),
  merged_into_id UUID REFERENCES crm_companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 2. CRM CONTACTS
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES crm_companies(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  headline TEXT,
  email TEXT,
  secondary_email TEXT,
  email_source TEXT,
  email_status TEXT DEFAULT 'unknown' CHECK (email_status IN ('verified','unverified','invalid','catch_all','warning','unknown')),
  email_verification_score INT,
  email_verification_details JSONB,
  email_verified_at TIMESTAMPTZ,
  email_opt_out BOOLEAN DEFAULT FALSE,
  email_opt_out_source TEXT,
  email_opt_out_at TIMESTAMPTZ,
  email_invalid BOOLEAN DEFAULT FALSE,
  email_invalid_reason TEXT,
  email_bounce_count INT DEFAULT 0,
  last_bounce_at TIMESTAMPTZ,
  phone TEXT,
  phone_status TEXT DEFAULT 'not_checked' CHECK (phone_status IN ('revealed','available','unavailable','not_checked')),
  phone_type TEXT CHECK (phone_type IN ('direct','hq','mobile','voip')),
  phone_confidence TEXT CHECK (phone_confidence IN ('high','medium','low')),
  phone_source TEXT,
  phone_revealed_at TIMESTAMPTZ,
  phone_credits_used INT DEFAULT 0,
  mobile TEXT,
  mobile_status TEXT DEFAULT 'not_checked' CHECK (mobile_status IN ('revealed','available','unavailable','not_checked')),
  mobile_confidence TEXT CHECK (mobile_confidence IN ('high','medium','low')),
  mobile_source TEXT,
  mobile_revealed_at TIMESTAMPTZ,
  mobile_credits_used INT DEFAULT 0,
  whatsapp TEXT,
  wechat TEXT,
  linkedin TEXT,
  job_title TEXT,
  department TEXT,
  seniority TEXT CHECK (seniority IN ('c_level','vp','director','manager','senior','staff','entry')),
  role TEXT,
  contact_type TEXT CHECK (contact_type IN ('decision_maker','influencer','gatekeeper','user','champion')),
  country TEXT,
  city TEXT,
  state TEXT,
  timezone TEXT,
  preferred_language TEXT DEFAULT 'en',
  location_display TEXT,
  lead_status TEXT DEFAULT 'new' CHECK (lead_status IN ('new','contacted','qualified','nurturing','opportunity','customer','lost','do_not_contact','unresponsive')),
  lead_score INT DEFAULT 0,
  lead_source TEXT,
  buyer_type TEXT,
  products_of_interest TEXT[],
  apollo_person_id TEXT UNIQUE,
  apollo_company_id TEXT,
  apollo_enriched_at TIMESTAMPTZ,
  apollo_person_payload JSONB,
  apollo_match_score DECIMAL(5,2),
  apollo_match_reason TEXT,
  total_emails_sent INT DEFAULT 0,
  total_emails_opened INT DEFAULT 0,
  total_emails_clicked INT DEFAULT 0,
  total_emails_replied INT DEFAULT 0,
  total_emails_bounced INT DEFAULT 0,
  last_emailed_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  last_clicked_at TIMESTAMPTZ,
  last_replied_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  mundus_company_id UUID,
  mundus_user_id UUID,
  is_registered BOOLEAN DEFAULT FALSE,
  receives_deal_offers BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','wms_import','apollo_search','apollo_enrich','csv_import','website_signup','referral','trade_show','inbound','linkedin')),
  source_detail TEXT,
  wms_contact_id UUID UNIQUE,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  scoring_points INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','archived','merged')),
  merged_into_id UUID REFERENCES crm_contacts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id)
);

-- 3. CRM ACTIVITIES
CREATE TABLE IF NOT EXISTS crm_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES crm_companies(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('email_sent','email_opened','email_clicked','email_replied','email_bounced','phone_call','phone_revealed','mobile_revealed','note','meeting','task','offer_sent','offer_viewed','enriched','imported','merged','stage_changed','assigned','tagged')),
  subject TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 4. SAVED SEARCHES
CREATE TABLE IF NOT EXISTS crm_saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('company','person')),
  filters JSONB NOT NULL DEFAULT '{}',
  columns JSONB DEFAULT '[]',
  sort_field TEXT DEFAULT 'relevance',
  sort_ascending BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  result_count INT DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  alert_enabled BOOLEAN DEFAULT FALSE,
  alert_frequency TEXT DEFAULT 'weekly',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LISTS
CREATE TABLE IF NOT EXISTS crm_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  list_type TEXT NOT NULL CHECK (list_type IN ('company','person','mixed')),
  color TEXT DEFAULT '#9B2251',
  is_dynamic BOOLEAN DEFAULT FALSE,
  dynamic_filters JSONB DEFAULT '{}',
  record_count INT DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LIST MEMBERS
CREATE TABLE IF NOT EXISTS crm_list_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES crm_lists(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
  company_id UUID REFERENCES crm_companies(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  CHECK (contact_id IS NOT NULL OR company_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_list_members_contact_unique ON crm_list_members(list_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_list_members_company_unique ON crm_list_members(list_id, company_id) WHERE company_id IS NOT NULL;

-- 7. APOLLO CACHE
CREATE TABLE IF NOT EXISTS apollo_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('company','person')),
  apollo_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  phone_available BOOLEAN DEFAULT FALSE,
  mobile_available BOOLEAN DEFAULT FALSE,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  UNIQUE(entity_type, apollo_id)
);

-- 8. PERSONAS
CREATE TABLE IF NOT EXISTS crm_personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  match_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. EMAIL SEQUENCES
CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL CHECK (target_type IN ('buyer','supplier','both')),
  max_emails INT DEFAULT 5,
  daily_send_limit INT DEFAULT 5,
  tone TEXT DEFAULT 'professional',
  language TEXT DEFAULT 'en',
  total_enrolled INT DEFAULT 0,
  total_completed INT DEFAULT 0,
  total_replied INT DEFAULT 0,
  avg_open_rate DECIMAL(5,2) DEFAULT 0,
  avg_reply_rate DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 10. EMAIL SEQUENCE STEPS
CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  delay_days INT NOT NULL,
  send_time_preference TEXT DEFAULT '09:00',
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  skip_if_replied BOOLEAN DEFAULT TRUE,
  skip_if_opened BOOLEAN DEFAULT FALSE,
  skip_if_clicked BOOLEAN DEFAULT FALSE,
  variant_label TEXT DEFAULT 'A',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sequence_id, step_number)
);

-- 11. EMAIL ENROLLMENTS
CREATE TABLE IF NOT EXISTS email_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  current_step INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','completed','bounced','opted_out','replied','cancelled','failed')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  next_send_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  pause_reason TEXT,
  UNIQUE(contact_id, sequence_id)
);

-- 12. EMAIL SENDS
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES email_enrollments(id),
  sequence_step_id UUID REFERENCES email_sequence_steps(id),
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  reply_to TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  open_count INT DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  click_count INT DEFAULT 0,
  replied_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  bounce_type TEXT CHECK (bounce_type IN ('hard','soft','complaint')),
  bounce_reason TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','opened','clicked','replied','bounced','complaint','failed','cancelled')),
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_model_used TEXT,
  ai_prompt_context JSONB,
  email_type TEXT DEFAULT 'sequence' CHECK (email_type IN ('sequence','manual','offer_share','follow_up','broadcast')),
  zoho_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. EMAIL EVENTS
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_send_id UUID NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('queued','sent','delivered','opened','clicked','replied','bounced','complaint','unsubscribed','spam_reported','auto_responded')),
  event_data JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ENRICHMENT JOBS
CREATE TABLE IF NOT EXISTS crm_enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL CHECK (job_type IN ('person_enrich','company_enrich','bulk_match','phone_reveal','mobile_reveal','bulk_phone_reveal','email_verify')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','partial','failed')),
  contact_ids UUID[] DEFAULT '{}',
  company_ids UUID[] DEFAULT '{}',
  record_count INT DEFAULT 0,
  result_data JSONB,
  credits_used INT DEFAULT 0,
  records_enriched INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 15. EMAIL DOMAIN HEALTH
CREATE TABLE IF NOT EXISTS email_domain_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT NOT NULL,
  date DATE NOT NULL,
  emails_sent INT DEFAULT 0,
  emails_delivered INT DEFAULT 0,
  emails_opened INT DEFAULT 0,
  emails_clicked INT DEFAULT 0,
  emails_replied INT DEFAULT 0,
  emails_bounced INT DEFAULT 0,
  emails_bounced_hard INT DEFAULT 0,
  emails_bounced_soft INT DEFAULT 0,
  emails_complained INT DEFAULT 0,
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  reply_rate DECIMAL(5,2),
  bounce_rate DECIMAL(5,2),
  complaint_rate DECIMAL(5,4),
  is_healthy BOOLEAN DEFAULT TRUE,
  alert_sent BOOLEAN DEFAULT FALSE,
  UNIQUE(domain, date)
);

-- 16. CREDIT USAGE
CREATE TABLE IF NOT EXISTS crm_credit_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credit_type TEXT NOT NULL CHECK (credit_type IN ('apollo_search','apollo_enrich','apollo_phone_reveal','apollo_mobile_reveal','apollo_bulk_match','email_verify','ai_personalize')),
  credits_used INT NOT NULL DEFAULT 1,
  contact_id UUID REFERENCES crm_contacts(id),
  company_id UUID REFERENCES crm_companies(id),
  enrichment_job_id UUID REFERENCES crm_enrichment_jobs(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 17. IMPORT LOGS
CREATE TABLE IF NOT EXISTS crm_import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_type TEXT NOT NULL CHECK (import_type IN ('wms_buyers','wms_suppliers','wms_leads','csv','apollo_bulk')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  total_records INT DEFAULT 0,
  imported INT DEFAULT 0,
  duplicates_found INT DEFAULT 0,
  duplicates_merged INT DEFAULT 0,
  duplicates_skipped INT DEFAULT 0,
  invalid_email INT DEFAULT 0,
  errors INT DEFAULT 0,
  list_ids UUID[] DEFAULT '{}',
  error_log JSONB DEFAULT '[]',
  file_name TEXT,
  file_url TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_crm_companies_domain ON crm_companies(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_companies_apollo ON crm_companies(apollo_company_id) WHERE apollo_company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_companies_stage ON crm_companies(stage);
CREATE INDEX IF NOT EXISTS idx_crm_companies_source ON crm_companies(source);
CREATE INDEX IF NOT EXISTS idx_crm_companies_owner ON crm_companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_country ON crm_companies(country);
CREATE INDEX IF NOT EXISTS idx_crm_companies_type ON crm_companies(company_type);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON crm_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_apollo ON crm_contacts(apollo_person_id) WHERE apollo_person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_wms ON crm_contacts(wms_contact_id) WHERE wms_contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_contacts_status ON crm_contacts(lead_status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_assigned ON crm_contacts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_source ON crm_contacts(source);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_country ON crm_contacts(country);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_phone_status ON crm_contacts(phone_status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_mobile_status ON crm_contacts(mobile_status);

CREATE INDEX IF NOT EXISTS idx_email_sends_contact ON email_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_sent ON email_sends(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_next ON email_enrollments(next_send_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_email_enrollments_contact ON email_enrollments(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_events_send ON email_events(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);

CREATE INDEX IF NOT EXISTS idx_apollo_cache_lookup ON apollo_cache(entity_type, apollo_id);
CREATE INDEX IF NOT EXISTS idx_apollo_cache_expiry ON apollo_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_list_members_list ON crm_list_members(list_id);
CREATE INDEX IF NOT EXISTS idx_list_members_contact ON crm_list_members(contact_id);
CREATE INDEX IF NOT EXISTS idx_list_members_company ON crm_list_members(company_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON crm_saved_searches(created_by);
CREATE INDEX IF NOT EXISTS idx_enrichment_status ON crm_enrichment_jobs(status);

CREATE INDEX IF NOT EXISTS idx_activities_contact ON crm_activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_company ON crm_activities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON crm_activities(activity_type);

CREATE INDEX IF NOT EXISTS idx_credit_usage_type ON crm_credit_usage(credit_type);
CREATE INDEX IF NOT EXISTS idx_credit_usage_date ON crm_credit_usage(created_at);

-- RLS: enable on all + admin-only policies (mundus_admin role)
CREATE OR REPLACE FUNCTION public.is_mundus_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid() AND r.name = 'mundus_admin'
  );
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'crm_companies','crm_contacts','crm_activities','crm_saved_searches',
    'crm_lists','crm_list_members','apollo_cache','crm_personas',
    'email_sequences','email_sequence_steps','email_enrollments','email_sends',
    'email_events','crm_enrichment_jobs','email_domain_health','crm_credit_usage',
    'crm_import_logs'
  ]) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin())',
      t || '_admin_all', t
    );
  END LOOP;
END $$;