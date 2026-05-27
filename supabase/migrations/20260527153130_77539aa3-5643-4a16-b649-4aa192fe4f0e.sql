
-- 1) Negotiation tokens: admin-only SELECT
DROP POLICY IF EXISTS negotiation_tokens_select_supplier ON public.negotiation_tokens;
DROP POLICY IF EXISTS negotiation_tokens_select_party ON public.negotiation_tokens;
DROP POLICY IF EXISTS negotiation_tokens_admin_select ON public.negotiation_tokens;
CREATE POLICY negotiation_tokens_admin_select ON public.negotiation_tokens
  FOR SELECT TO authenticated
  USING (is_mundus_admin());

-- 2) Request attachments storage — scope by first folder = company.id
DROP POLICY IF EXISTS "request_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_company_select" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_company_insert" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_company_update" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_company_delete" ON storage.objects;

CREATE POLICY "request_attachments_company_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND (
      is_mundus_admin()
      OR owner = auth.uid()
      OR (storage.foldername(name))[1] = current_user_company_id()::text
    )
  );

CREATE POLICY "request_attachments_company_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'request-attachments'
    AND (
      is_mundus_admin()
      OR (storage.foldername(name))[1] = current_user_company_id()::text
    )
  );

CREATE POLICY "request_attachments_company_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND (is_mundus_admin() OR owner = auth.uid())
  );

CREATE POLICY "request_attachments_company_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND (is_mundus_admin() OR owner = auth.uid())
  );

-- 3) Email verifications: require authenticated for insert
DROP POLICY IF EXISTS email_verifications_public_insert ON public.email_verifications;
DROP POLICY IF EXISTS email_verifications_auth_insert ON public.email_verifications;
CREATE POLICY email_verifications_auth_insert ON public.email_verifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4) Realtime topic scoping
DROP POLICY IF EXISTS realtime_authenticated_only ON realtime.messages;
DROP POLICY IF EXISTS realtime_topic_scoped ON realtime.messages;

CREATE POLICY realtime_topic_scoped ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin()
    OR realtime.topic() = 'buyer-orders-list'
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
