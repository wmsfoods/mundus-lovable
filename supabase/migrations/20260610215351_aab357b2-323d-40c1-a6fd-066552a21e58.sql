
CREATE OR REPLACE FUNCTION public.get_agrostats_cron_secret()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agrostats_cron_secret' LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_agrostats_cron_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_agrostats_cron_secret() TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'admin_get_agrostats_cron_secret' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.admin_get_agrostats_cron_secret() FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.admin_get_agrostats_cron_secret() TO service_role';
  END IF;
END $$;
