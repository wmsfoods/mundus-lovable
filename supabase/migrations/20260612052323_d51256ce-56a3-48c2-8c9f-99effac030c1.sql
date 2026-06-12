DO $$
DECLARE
  v_secret text;
  v_req_id bigint;
  v_status int;
  v_body jsonb;
BEGIN
  SELECT public.get_agrostats_cron_secret() INTO v_secret;
  SELECT net.http_post(
    url := 'https://kypyqxicwbusadnlhnwe.supabase.co/functions/v1/agrostats-sync',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', v_secret),
    body := jsonb_build_object('action','probe-select')
  ) INTO v_req_id;
  FOR i IN 1..30 LOOP
    PERFORM pg_sleep(1);
    SELECT status_code, content::jsonb INTO v_status, v_body
      FROM net._http_response WHERE id = v_req_id;
    EXIT WHEN v_body IS NOT NULL;
  END LOOP;
  INSERT INTO public._agrostats_probe_results(payload)
  VALUES (jsonb_build_object('action','probe-select','req_id',v_req_id,'status',v_status,'body',v_body));
END $$;

UPDATE public.agrostats_sync_state
SET last_error = NULL,
    last_failed_offset = NULL,
    last_failed_error = NULL,
    last_failed_at = NULL,
    current_chunk_offset = NULL,
    current_chunk_started_at = NULL,
    lease_until = NULL,
    status = 'backfilling',
    updated_at = now()
WHERE id = 1;