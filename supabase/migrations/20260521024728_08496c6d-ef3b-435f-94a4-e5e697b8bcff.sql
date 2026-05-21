
CREATE TABLE IF NOT EXISTS public.outreach_emails (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  contact_email text NOT NULL,
  contact_name text,
  contact_company text,
  country text,
  subject text NOT NULL,
  body_html text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','opened','clicked','replied','bounced')),
  sent_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  sent_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, contact_email)
);

CREATE INDEX IF NOT EXISTS outreach_emails_offer_idx ON public.outreach_emails (offer_id);
CREATE INDEX IF NOT EXISTS outreach_emails_status_idx ON public.outreach_emails (status);

ALTER TABLE public.outreach_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS outreach_emails_public_all ON public.outreach_emails;
CREATE POLICY outreach_emails_public_all ON public.outreach_emails
  FOR ALL TO public USING (true) WITH CHECK (true);
