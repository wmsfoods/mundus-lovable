
ALTER TABLE public.user_requests
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS registration_country TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS proteins TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS countries_of_operation TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS certificate_url TEXT,
  ADD COLUMN IF NOT EXISTS scan_result JSONB;

-- Allow Mundus admins to read & update user_requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_requests' AND policyname='user_requests_admin_all') THEN
    CREATE POLICY user_requests_admin_all ON public.user_requests
      FOR ALL TO authenticated
      USING (public.is_mundus_admin())
      WITH CHECK (public.is_mundus_admin());
  END IF;
END $$;

-- Allow anonymous (signup) inserts of pending requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_requests' AND policyname='user_requests_public_insert') THEN
    CREATE POLICY user_requests_public_insert ON public.user_requests
      FOR INSERT TO anon, authenticated
      WITH CHECK (status = 'pending');
  END IF;
END $$;

ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;
