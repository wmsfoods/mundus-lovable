
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT true,
  new_request_response boolean NOT NULL DEFAULT true,
  negotiation_rounds boolean NOT NULL DEFAULT true,
  order_status_changes boolean NOT NULL DEFAULT true,
  new_buyer_request boolean NOT NULL DEFAULT true,
  offer_deactivated boolean NOT NULL DEFAULT true,
  deal_closed boolean NOT NULL DEFAULT true,
  shipping_instructions boolean NOT NULL DEFAULT true,
  new_chat_message boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text,
  icon text NOT NULL DEFAULT 'bell',
  category text NOT NULL DEFAULT 'system',
  link_url text,
  link_label text,
  related_type text,
  related_id uuid,
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user
  ON public.app_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_company
  ON public.app_notifications(company_id, created_at DESC);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prefs"
  ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users see own notifications"
  ON public.app_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.app_notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users may insert notifications (used by client-side trigger code).
CREATE POLICY "Authenticated can insert notifications"
  ON public.app_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TRIGGER trg_notification_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
