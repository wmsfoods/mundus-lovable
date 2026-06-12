DO $$
DECLARE
  v_secret text;
  v_req_id bigint;
  v_resp jsonb;
  v_status int;
BEGIN
  SELECT public.get_agrostats_cron_secret() INTO v_secret;
  SELECT net.http_post(
    url := 'https://kypyqxicwbusadnlhnwe.supabase.co/functions/v1/agrostats-sync',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', v_secret),
    body := jsonb_build_object('action','inspect-columns')
  ) INTO v_req_id;

  -- Poll for response
  FOR i IN 1..30 LOOP
    PERFORM pg_sleep(1);
    SELECT status_code, content::jsonb INTO v_status, v_resp
      FROM net._http_response WHERE id = v_req_id;
    EXIT WHEN v_resp IS NOT NULL;
  END LOOP;

  INSERT INTO public._agrostats_probe_results(payload)
  VALUES (jsonb_build_object('req_id', v_req_id, 'status', v_status, 'body', v_resp));
END $$;