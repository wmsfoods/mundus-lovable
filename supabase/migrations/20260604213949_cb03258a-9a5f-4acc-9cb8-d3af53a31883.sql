-- 1) Tabela rate_limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  bucket TIMESTAMPTZ NOT NULL,
  count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (key, bucket)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket ON public.rate_limits (bucket);

-- 2) Grants (apenas service_role; sem anon/authenticated — só Edge Functions usam)
GRANT ALL ON public.rate_limits TO service_role;

-- 3) RLS habilitado e sem políticas → ninguém além de service_role acessa
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 4) Função check_rate_limit (fail-open)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_window_seconds INT,
  p_max INT
)
RETURNS TABLE(allowed BOOLEAN, remaining INT, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket TIMESTAMPTZ;
  v_count INT;
  v_reset TIMESTAMPTZ;
BEGIN
  -- Truncate now() to the start of the window (epoch-aligned)
  v_bucket := to_timestamp(
    floor(extract(epoch FROM now()) / GREATEST(p_window_seconds, 1)) * GREATEST(p_window_seconds, 1)
  );
  v_reset := v_bucket + make_interval(secs => GREATEST(p_window_seconds, 1));

  BEGIN
    INSERT INTO public.rate_limits (key, bucket, count)
    VALUES (p_key, v_bucket, 1)
    ON CONFLICT (key, bucket)
    DO UPDATE SET count = public.rate_limits.count + 1
    RETURNING public.rate_limits.count INTO v_count;
  EXCEPTION WHEN OTHERS THEN
    -- Fail-open: never break the product on rate-limit infra failure
    RETURN QUERY SELECT true, p_max, v_reset;
    RETURN;
  END;

  IF v_count > p_max THEN
    RETURN QUERY SELECT false, 0, v_reset;
  ELSE
    RETURN QUERY SELECT true, GREATEST(p_max - v_count, 0), v_reset;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO service_role;

-- 5) Cleanup function (run daily via pg_cron — scheduled separately via insert tool)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limits WHERE bucket < now() - interval '1 day';
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;