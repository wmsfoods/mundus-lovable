
ALTER TABLE public.agrostats_sync_state
  ADD COLUMN IF NOT EXISTS current_chunk_offset bigint,
  ADD COLUMN IF NOT EXISTS current_chunk_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_failed_offset bigint,
  ADD COLUMN IF NOT EXISTS last_failed_error text,
  ADD COLUMN IF NOT EXISTS last_failed_at timestamptz;

CREATE OR REPLACE FUNCTION public.get_agrostats_cron_runs()
RETURNS TABLE (
  runid bigint,
  jobid bigint,
  job_pid integer,
  database text,
  username text,
  command text,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT d.runid, d.jobid, d.job_pid, d.database, d.username, d.command,
         d.status, d.return_message, d.start_time, d.end_time
    FROM cron.job_run_details d
    JOIN cron.job j ON j.jobid = d.jobid
   WHERE j.jobname = 'agrostats_backfill_tick'
   ORDER BY d.start_time DESC NULLS LAST
   LIMIT 3
$$;

REVOKE ALL ON FUNCTION public.get_agrostats_cron_runs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_agrostats_cron_runs() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_agrostats_cron_runs() TO service_role;
