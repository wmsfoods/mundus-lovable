DO $$
DECLARE
  v_secret text;
  v_req_id bigint;
BEGIN
  SELECT public.get_agrostats_cron_secret() INTO v_secret;
  SELECT net.http_post(
    url := 'https://kypyqxicwbusadnlhnwe.supabase.co/functions/v1/agrostats-sync',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', v_secret),
    body := jsonb_build_object('action','inspect-columns')
  ) INTO v_req_id;
  PERFORM pg_sleep(8);
  RAISE NOTICE 'request_id=%', v_req_id;
END $$;

CREATE TABLE IF NOT EXISTS public._agrostats_probe_results (
  id bigserial primary key,
  created_at timestamptz default now(),
  payload jsonb
);
GRANT ALL ON public._agrostats_probe_results TO service_role;

INSERT INTO public._agrostats_probe_results(payload)
SELECT content::jsonb FROM net._http_response
WHERE created > now() - interval '2 minutes'
ORDER BY id DESC LIMIT 1;