
-- email_providers
CREATE TABLE public.email_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  provider TEXT NOT NULL CHECK (provider IN ('zoho','microsoft','smtp','sendgrid')),
  display_name TEXT NOT NULL,
  from_address TEXT NOT NULL,
  reply_to TEXT NULL,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  configured_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all email_providers" ON public.email_providers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_email_providers_updated BEFORE UPDATE ON public.email_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- outreach_templates
CREATE TABLE public.outreach_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('initial_offer','followup_24h','followup_3d','auction_result','auction_invite','custom')),
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','pt','es')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all outreach_templates" ON public.outreach_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_outreach_templates_updated BEFORE UPDATE ON public.outreach_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- outreach_campaigns
CREATE TABLE public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NULL,
  auction_id UUID NULL,
  campaign_type TEXT NOT NULL,
  template_id UUID NULL REFERENCES public.outreach_templates(id) ON DELETE SET NULL,
  provider_id UUID NULL REFERENCES public.email_providers(id) ON DELETE SET NULL,
  sent_by UUID NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  recipients_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  opened_count INT NOT NULL DEFAULT 0,
  clicked_count INT NOT NULL DEFAULT 0,
  bounced_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','partial','failed')),
  sent_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all outreach_campaigns" ON public.outreach_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_outreach_campaigns_updated BEFORE UPDATE ON public.outreach_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- outreach_recipients
CREATE TABLE public.outreach_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT NULL,
  company_name TEXT NULL,
  country TEXT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','opened','clicked','bounced','failed','unsubscribed')),
  tracking_id UUID NOT NULL DEFAULT gen_random_uuid(),
  sent_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  opened_at TIMESTAMPTZ NULL,
  clicked_at TIMESTAMPTZ NULL,
  bounced_at TIMESTAMPTZ NULL,
  opens_count INT NOT NULL DEFAULT 0,
  clicks_count INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outreach_recipients_tracking ON public.outreach_recipients(tracking_id);
CREATE INDEX idx_outreach_recipients_campaign ON public.outreach_recipients(campaign_id);
CREATE INDEX idx_outreach_recipients_email ON public.outreach_recipients(contact_email);
ALTER TABLE public.outreach_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth all outreach_recipients" ON public.outreach_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_outreach_recipients_updated BEFORE UPDATE ON public.outreach_recipients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default Zoho provider
INSERT INTO public.email_providers (provider, display_name, from_address, reply_to, is_default, is_active)
VALUES ('zoho', 'Mundus Trade', 'contact@mundustrade.com', 'contact@mundustrade.com', true, true);

-- Seed default English templates with Mundus branding
INSERT INTO public.outreach_templates (name, category, language, subject, body_html, body_text, variables, is_default) VALUES
('Initial Offer', 'initial_offer', 'en',
 'New offer from {{supplier_name}} — {{product_name}}',
 '<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1a1a1a"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff"><tr><td style="background:#8B2252;padding:24px;color:#ffffff"><h1 style="margin:0;font-size:20px">Mundus Trade</h1></td></tr><tr><td style="padding:32px 24px"><h2 style="margin:0 0 16px;color:#8B2252">Hi {{contact_name}},</h2><p style="margin:0 0 16px;line-height:1.5">{{supplier_name}} has a new offer that may interest you:</p><div style="border:1px solid #eee;border-radius:8px;padding:16px;margin:16px 0;background:#fafafa"><h3 style="margin:0 0 8px;color:#1a1a1a">{{product_name}}</h3><p style="margin:4px 0;color:#666"><strong>Origin:</strong> {{origin_country}}</p><p style="margin:4px 0;color:#666"><strong>Price:</strong> {{price}} {{incoterm}}</p><p style="margin:4px 0;color:#666"><strong>Quantity:</strong> {{quantity}}</p></div><div style="text-align:center;margin:24px 0"><a href="{{offer_url}}" style="background:#8B2252;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">View Offer →</a></div><p style="margin:24px 0 0;color:#666;font-size:13px">Best regards,<br/>The Mundus Trade Team</p></td></tr></table></td></tr></table></body></html>',
 'Hi {{contact_name}}, {{supplier_name}} has a new offer: {{product_name}} from {{origin_country}}. View at {{offer_url}}',
 '["contact_name","supplier_name","product_name","origin_country","price","incoterm","quantity","offer_url"]'::jsonb, true),
('Follow-up 24h', 'followup_24h', 'en',
 'Following up — {{product_name}} offer',
 '<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1a1a1a"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff"><tr><td style="background:#8B2252;padding:24px;color:#ffffff"><h1 style="margin:0;font-size:20px">Mundus Trade</h1></td></tr><tr><td style="padding:32px 24px"><p style="margin:0 0 16px">Hi {{contact_name}},</p><p style="margin:0 0 16px;line-height:1.5">Just following up on the <strong>{{product_name}}</strong> offer we sent yesterday — wanted to make sure it reached you.</p><p style="margin:0 0 16px;line-height:1.5">Let me know if you have any questions.</p><div style="text-align:center;margin:24px 0"><a href="{{offer_url}}" style="background:#8B2252;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">Review Offer →</a></div><p style="margin:24px 0 0;color:#666;font-size:13px">Best regards,<br/>The Mundus Trade Team</p></td></tr></table></td></tr></table></body></html>',
 'Hi {{contact_name}}, just following up on {{product_name}}. {{offer_url}}',
 '["contact_name","product_name","offer_url"]'::jsonb, true),
('Follow-up 3d', 'followup_3d', 'en',
 'Still available — {{product_name}} from {{origin_country}}',
 '<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1a1a1a"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff"><tr><td style="background:#8B2252;padding:24px;color:#ffffff"><h1 style="margin:0;font-size:20px">Mundus Trade</h1></td></tr><tr><td style="padding:32px 24px"><p style="margin:0 0 16px">Hi {{contact_name}},</p><p style="margin:0 0 16px;line-height:1.5">The <strong>{{product_name}}</strong> offer from <strong>{{origin_country}}</strong> is still available — and we have additional offers that may match your needs.</p><div style="text-align:center;margin:24px 0"><a href="{{offer_url}}" style="background:#8B2252;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">Browse Offers →</a></div><p style="margin:24px 0 0;color:#666;font-size:13px">Best regards,<br/>The Mundus Trade Team</p></td></tr></table></td></tr></table></body></html>',
 'Hi {{contact_name}}, {{product_name}} from {{origin_country}} is still available. {{offer_url}}',
 '["contact_name","product_name","origin_country","offer_url"]'::jsonb, true),
('Auction Result', 'auction_result', 'en',
 'Auction {{auction_opp}} — Results',
 '<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1a1a1a"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff"><tr><td style="background:#8B2252;padding:24px;color:#ffffff"><h1 style="margin:0;font-size:20px">Mundus Trade</h1></td></tr><tr><td style="padding:32px 24px"><h2 style="margin:0 0 16px;color:#8B2252">Auction {{auction_opp}} closed</h2><p style="margin:0 0 16px">Hi {{contact_name}},</p><p style="margin:0 0 16px;line-height:1.5">Here are the final results:</p><table width="100%" cellpadding="8" style="border-collapse:collapse;margin:16px 0"><tr><td style="background:#fafafa;border:1px solid #eee"><strong>Winning Price</strong></td><td style="border:1px solid #eee">{{winning_price}}</td></tr><tr><td style="background:#fafafa;border:1px solid #eee"><strong>Your Price</strong></td><td style="border:1px solid #eee">{{your_price}}</td></tr></table><div style="text-align:center;margin:24px 0"><a href="{{auction_url}}" style="background:#8B2252;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600">View Auction →</a></div><p style="margin:24px 0 0;color:#666;font-size:13px">Best regards,<br/>The Mundus Trade Team</p></td></tr></table></td></tr></table></body></html>',
 'Auction {{auction_opp}} closed. Winning: {{winning_price}}, Yours: {{your_price}}. {{auction_url}}',
 '["contact_name","auction_opp","winning_price","your_price","auction_url"]'::jsonb, true);
