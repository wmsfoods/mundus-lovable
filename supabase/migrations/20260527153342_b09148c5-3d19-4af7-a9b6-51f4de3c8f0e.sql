
-- Make company-files private
UPDATE storage.buckets SET public = false WHERE id = 'company-files';

-- Drop legacy permissive policies on company-files
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND (qual LIKE '%company-files%' OR with_check LIKE '%company-files%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY company_files_company_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-files'
    AND (
      is_mundus_admin()
      OR owner = auth.uid()
      OR (storage.foldername(name))[1] = current_user_company_id()::text
    )
  );

CREATE POLICY company_files_company_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-files'
    AND (
      is_mundus_admin()
      OR (storage.foldername(name))[1] = current_user_company_id()::text
    )
  );

CREATE POLICY company_files_company_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-files'
    AND (is_mundus_admin() OR owner = auth.uid()
         OR (storage.foldername(name))[1] = current_user_company_id()::text)
  );

CREATE POLICY company_files_company_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-files'
    AND (is_mundus_admin() OR owner = auth.uid()
         OR (storage.foldername(name))[1] = current_user_company_id()::text)
  );

-- Tighten offer_snapshots to participants
DROP POLICY IF EXISTS offer_snapshots_select_all ON public.offer_snapshots;
CREATE POLICY offer_snapshots_select_participants ON public.offer_snapshots
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin()
    OR EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_snapshots.id
        AND o.supplier_id = current_user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.negotiations n
      WHERE n.offer_id = offer_snapshots.id
        AND n.buyer_company_id = current_user_company_id()
    )
  );

-- Realtime: update topic for per-company buyer orders, drop global allowance
DROP POLICY IF EXISTS realtime_topic_scoped ON realtime.messages;
CREATE POLICY realtime_topic_scoped ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin()
    OR (
      realtime.topic() ~ '^buyer-orders-[0-9a-f-]{36}'
      AND substring(realtime.topic() from '[0-9a-f-]{36}') = current_user_company_id()::text
    )
    OR (
      realtime.topic() ~ '^neg-(chat|row)-[0-9a-f-]{36}'
      AND EXISTS (
        SELECT 1 FROM public.negotiations n
        LEFT JOIN public.offers o ON o.id = n.offer_id
        WHERE n.id::text = substring(realtime.topic() from '[0-9a-f-]{36}')
          AND (
            n.buyer_company_id = current_user_company_id()
            OR o.supplier_id = current_user_company_id()
          )
      )
    )
    OR (
      realtime.topic() ~ '^deal-status-[0-9a-f-]{36}'
      AND EXISTS (
        SELECT 1 FROM public.orders ord
        LEFT JOIN public.offers o ON o.id = ord.offer_id
        WHERE ord.id::text = substring(realtime.topic() from '[0-9a-f-]{36}')
          AND (
            ord.buyer_company_id = current_user_company_id()
            OR o.supplier_id = current_user_company_id()
          )
      )
    )
    OR (
      realtime.topic() ~ '^supplier-sales-[0-9a-f-]{36}'
      AND substring(realtime.topic() from '[0-9a-f-]{36}') = current_user_company_id()::text
    )
  );
