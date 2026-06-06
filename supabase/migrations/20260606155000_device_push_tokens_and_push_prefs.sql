-- Mobile push: device tokens + push channel preference + dispatch trigger

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user
  ON public.device_push_tokens(user_id);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
  ON public.device_push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_device_push_tokens_updated_at
  BEFORE UPDATE ON public.device_push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS push boolean NOT NULL DEFAULT true;

-- Best-effort HTTP dispatch to send-push edge function (requires pg_net + secret).
CREATE OR REPLACE FUNCTION public.tg_dispatch_push_on_app_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
  v_url text := 'https://kypyqxicwbusadnlhnwe.supabase.co/functions/v1/send-push';
BEGIN
  BEGIN
    v_secret := current_setting('app.push_webhook_secret', true);
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  IF v_secret IS NULL OR v_secret = '' THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.body,
      'url', NEW.link_url,
      'category', NEW.category,
      'notification_id', NEW.id
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_push_on_app_notification ON public.app_notifications;
CREATE TRIGGER trg_dispatch_push_on_app_notification
  AFTER INSERT ON public.app_notifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_dispatch_push_on_app_notification();

COMMENT ON FUNCTION public.tg_dispatch_push_on_app_notification IS
  'Dispatches mobile push via send-push edge function. Set app.push_webhook_secret (same as PUSH_WEBHOOK_SECRET) or use Supabase Database Webhook on app_notifications INSERT.';
