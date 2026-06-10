-- Add last_sync_at column to track most recent successful sync
ALTER TABLE public.agrostats_sync_state
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;

-- Ensure required extensions for scheduled cron → edge function calls
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Create / reuse a vault secret holding the CRON shared secret used to
-- authenticate scheduled invocations of the agrostats-sync edge function.
-- The same value must be configured in Lovable Secrets as CRON_SECRET so
-- the edge function can verify the x-cron-secret header.
DO $$
DECLARE
  v_id uuid;
  v_val text;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'agrostats_cron_secret' LIMIT 1;
  IF v_id IS NULL THEN
    v_val := encode(gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(v_val, 'agrostats_cron_secret', 'Shared secret for agrostats-sync scheduled invocations');
  END IF;
END$$;

-- Replace the old monthly schedule with a weekly Monday 06:00 UTC schedule
DO $$
BEGIN
  PERFORM cron.unschedule('agrostats-monthly-incremental');
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

DO $$
BEGIN
  PERFORM cron.unschedule('agrostats-weekly-incremental');
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

SELECT cron.schedule(
  'agrostats-weekly-incremental',
  '0 6 * * 1',
  $job$
  SELECT net.http_post(
    url := 'https://kypyqxicwbusadnlhnwe.supabase.co/functions/v1/agrostats-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agrostats_cron_secret' LIMIT 1)
    ),
    body := '{"action":"incremental"}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $job$
);

-- Admin-only helper so an authenticated admin can read the vault-stored
-- cron secret from the UI and paste it into Lovable Secrets as CRON_SECRET.
CREATE OR REPLACE FUNCTION public.admin_get_agrostats_cron_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  IF NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'agrostats_cron_secret' LIMIT 1;
  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_agrostats_cron_secret() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_agrostats_cron_secret() TO authenticated;