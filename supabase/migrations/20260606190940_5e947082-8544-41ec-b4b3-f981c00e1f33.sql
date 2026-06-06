
-- 1. Settings table (backend-only)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to app_settings" ON public.app_settings;
CREATE POLICY "No client access to app_settings"
  ON public.app_settings
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- 2. Rewrite dispatch trigger to read secret from app_settings
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
  -- Try GUC first (Option B classic), then fall back to app_settings row
  BEGIN
    v_secret := current_setting('app.push_webhook_secret', true);
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  IF v_secret IS NULL OR v_secret = '' THEN
    SELECT value INTO v_secret
    FROM public.app_settings
    WHERE key = 'push_webhook_secret';
  END IF;

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

-- 3. Ensure pg_net extension is available
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
