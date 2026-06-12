ALTER TABLE public.agrostats_sync_state ADD COLUMN IF NOT EXISTS lease_until timestamptz;

CREATE OR REPLACE FUNCTION public.claim_agrostats_backfill_lease(_seconds int DEFAULT 120)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ok boolean := false;
BEGIN
  UPDATE public.agrostats_sync_state
     SET lease_until = now() + make_interval(secs => _seconds),
         updated_at = now()
   WHERE id = 1
     AND (lease_until IS NULL OR lease_until < now());
  GET DIAGNOSTICS _ok = ROW_COUNT;
  RETURN _ok;
END;
$$;

CREATE OR REPLACE FUNCTION public.renew_agrostats_backfill_lease(_seconds int DEFAULT 120)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.agrostats_sync_state
     SET lease_until = now() + make_interval(secs => _seconds),
         updated_at = now()
   WHERE id = 1;
$$;

CREATE OR REPLACE FUNCTION public.release_agrostats_backfill_lease()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.agrostats_sync_state SET lease_until = NULL, updated_at = now() WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public.claim_agrostats_backfill_lease(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.renew_agrostats_backfill_lease(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_agrostats_backfill_lease() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_agrostats_backfill_lease(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_agrostats_backfill_lease(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_agrostats_backfill_lease() TO service_role;

-- Cron tick: invokes agrostats-sync every minute with x-cron-secret.
-- The 'process' action exits cheaply when status != 'backfilling'.
SELECT cron.unschedule('agrostats_backfill_tick') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'agrostats_backfill_tick'
);

SELECT cron.schedule(
  'agrostats_backfill_tick',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://kypyqxicwbusadnlhnwe.supabase.co/functions/v1/agrostats-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agrostats_cron_secret' LIMIT 1)
    ),
    body := '{"action":"process"}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $cron$
);