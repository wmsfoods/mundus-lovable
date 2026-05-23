-- round_proposals adjustments
ALTER TABLE public.round_proposals ADD COLUMN IF NOT EXISTS side TEXT CHECK (side IN ('buyer', 'supplier'));
ALTER TABLE public.round_proposals ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'counter' CHECK (type IN ('bid', 'counter', 'accept', 'reject'));
ALTER TABLE public.round_proposals ADD COLUMN IF NOT EXISTS message TEXT;

-- negotiations adjustments
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS current_round INT DEFAULT 1;
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS max_rounds INT DEFAULT 4;
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS negotiation_type TEXT DEFAULT 'manual' CHECK (negotiation_type IN ('manual', 'auction'));
ALTER TABLE public.negotiations ADD COLUMN IF NOT EXISTS rejection_cooldown_until TIMESTAMPTZ;

-- cut_rounds adjustments
ALTER TABLE public.cut_rounds ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open' CHECK (status IN ('open', 'agreed', 'rejected'));
ALTER TABLE public.cut_rounds ADD COLUMN IF NOT EXISTS agreed_at TIMESTAMPTZ;
ALTER TABLE public.cut_rounds ADD COLUMN IF NOT EXISTS agreed_by TEXT CHECK (agreed_by IN ('buyer', 'supplier', 'both'));

-- offer_views
CREATE TABLE IF NOT EXISTS public.offer_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  viewer_user_id UUID,
  viewer_company_id UUID,
  viewer_country TEXT,
  viewer_ip TEXT,
  source TEXT DEFAULT 'marketplace' CHECK (source IN ('email', 'dashboard', 'marketplace', 'direct_link', 'notification')),
  session_duration_seconds INT,
  viewed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offer_views_offer ON public.offer_views(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_views_viewer ON public.offer_views(viewer_company_id);
CREATE INDEX IF NOT EXISTS idx_offer_views_at ON public.offer_views(viewed_at);
ALTER TABLE public.offer_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier sees own offer views" ON public.offer_views
  FOR SELECT TO authenticated
  USING (
    offer_id IN (SELECT id FROM public.offers WHERE supplier_id = (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1))
  );

CREATE POLICY "Admins see all views" ON public.offer_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE user_id = auth.uid() AND role IN ('mundus_admin'))
  );

CREATE POLICY "Anyone inserts views" ON public.offer_views
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- offer_distributions
CREATE TABLE IF NOT EXISTS public.offer_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  target_company_id UUID,
  target_email TEXT,
  target_country TEXT,
  sent_by_user_id UUID,
  channel TEXT DEFAULT 'email' CHECK (channel IN ('email', 'notification', 'both')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_offer_dist_offer ON public.offer_distributions(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_dist_target ON public.offer_distributions(target_company_id);
ALTER TABLE public.offer_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier sees own distributions" ON public.offer_distributions
  FOR SELECT TO authenticated
  USING (
    offer_id IN (SELECT id FROM public.offers WHERE supplier_id = (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1))
  );

CREATE POLICY "Admins manage distributions" ON public.offer_distributions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.company_users WHERE user_id = auth.uid() AND role IN ('mundus_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.company_users WHERE user_id = auth.uid() AND role IN ('mundus_admin'))
  );

-- negotiation_messages
CREATE TABLE IF NOT EXISTS public.negotiation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_side TEXT NOT NULL CHECK (sender_side IN ('buyer', 'supplier', 'mundus')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'proposal', 'system', 'item_update')),
  content TEXT,
  structured_data JSONB,
  proposal_status TEXT CHECK (proposal_status IN ('pending', 'accepted', 'declined', 'countered')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  emailed BOOLEAN DEFAULT false,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_neg_messages_neg ON public.negotiation_messages(negotiation_id);
CREATE INDEX IF NOT EXISTS idx_neg_messages_created ON public.negotiation_messages(created_at);
ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants see messages" ON public.negotiation_messages
  FOR SELECT TO authenticated
  USING (
    negotiation_id IN (
      SELECT n.id FROM public.negotiations n
      WHERE n.buyer_company_id = (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1)
      OR n.offer_id IN (SELECT id FROM public.offers WHERE supplier_id = (SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1))
    )
  );

CREATE POLICY "Participants insert messages" ON public.negotiation_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid());