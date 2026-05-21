
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web','mobile')),
  category TEXT NOT NULL DEFAULT 'general',
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','buyer','supplier','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (key, platform)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read flags" ON public.feature_flags
  FOR SELECT USING (public.is_mundus_admin());
CREATE POLICY "admins insert flags" ON public.feature_flags
  FOR INSERT WITH CHECK (public.is_mundus_admin());
CREATE POLICY "admins update flags" ON public.feature_flags
  FOR UPDATE USING (public.is_mundus_admin());
CREATE POLICY "admins delete flags" ON public.feature_flags
  FOR DELETE USING (public.is_mundus_admin());

CREATE TRIGGER trg_feature_flags_updated
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.feature_flags (key, platform, category, label, description, audience, enabled) VALUES
  ('marketplace', 'web', 'buyer', 'Marketplace', 'Browse supplier offers in the marketplace', 'buyer', true),
  ('negotiations', 'web', 'buyer', 'Negotiations', 'Bid and counter-offer flows', 'buyer', true),
  ('requests', 'web', 'buyer', 'Buyer Requests', 'Create and manage purchase requests', 'buyer', true),
  ('orders', 'web', 'buyer', 'Orders', 'View and manage orders', 'buyer', true),
  ('chat', 'web', 'buyer', 'Chat', 'Buyer chat with suppliers', 'buyer', true),
  ('procurement_intelligence', 'web', 'buyer', 'Procurement Intelligence', 'AI-driven procurement insights', 'buyer', true),
  ('offers_management', 'web', 'supplier', 'Offers Management', 'Create and manage offers', 'supplier', true),
  ('sales', 'web', 'supplier', 'Sales', 'Sales dashboard and order management', 'supplier', true),
  ('price_benchmark', 'web', 'supplier', 'Price Benchmark', 'Compare prices across markets', 'supplier', true),
  ('supplier_analytics', 'web', 'supplier', 'Supplier Analytics', 'Performance analytics for suppliers', 'supplier', true),
  ('outreach', 'web', 'supplier', 'Outreach', 'Buyer outreach tools', 'supplier', true),
  ('crm_pipeline', 'web', 'admin', 'CRM Pipeline', 'Sales pipeline and prospect tracking', 'admin', true),
  ('meeting_prep_ai', 'web', 'admin', 'AI Meeting Prep', 'AI-generated meeting briefs', 'admin', true),
  ('prospecting', 'web', 'admin', 'Prospecting', 'Find companies and people', 'admin', true),
  ('marketplace', 'mobile', 'buyer', 'Marketplace', 'Browse supplier offers on mobile', 'buyer', true),
  ('negotiations', 'mobile', 'buyer', 'Negotiations', 'Bid and counter-offer flows on mobile', 'buyer', true),
  ('orders', 'mobile', 'buyer', 'Orders', 'View orders on mobile', 'buyer', true),
  ('chat', 'mobile', 'buyer', 'Chat', 'Buyer chat on mobile', 'buyer', true),
  ('push_notifications', 'mobile', 'general', 'Push Notifications', 'Mobile push notifications', 'all', false),
  ('offers_management', 'mobile', 'supplier', 'Offers Management', 'Create and manage offers on mobile', 'supplier', true),
  ('sales', 'mobile', 'supplier', 'Sales', 'Sales view on mobile', 'supplier', true),
  ('quick_quote', 'mobile', 'supplier', 'Quick Quote', 'Fast quoting from mobile', 'supplier', false),
  ('biometric_login', 'mobile', 'general', 'Biometric Login', 'Face ID / Touch ID', 'all', false),
  ('offline_mode', 'mobile', 'general', 'Offline Mode', 'Work without connection', 'all', false)
ON CONFLICT (key, platform) DO NOTHING;
