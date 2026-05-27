
-- ============================================================
-- SECURITY HARDENING SPRINT 6
-- ============================================================

-- 1) NEGOTIATION_TOKENS: restrict SELECT to authenticated participants/admins.
--    Guest token flow already requires auth elsewhere (negotiations RLS).
DROP POLICY IF EXISTS "Anyone can read by token" ON public.negotiation_tokens;
CREATE POLICY negotiation_tokens_select_party ON public.negotiation_tokens
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin()
    OR EXISTS (
      SELECT 1 FROM negotiations n
      LEFT JOIN offers o ON o.id = n.offer_id
      WHERE n.id = negotiation_tokens.negotiation_id
        AND (n.buyer_company_id = current_user_company_id()
             OR o.supplier_id = current_user_company_id())
    )
  );

-- 2) BUYER_REQUESTS: tighten SELECT to owner + targeted supplier + admin
DROP POLICY IF EXISTS buyer_requests_select_scoped ON public.buyer_requests;
CREATE POLICY buyer_requests_select_scoped ON public.buyer_requests
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin()
    OR buyer_company_id = current_user_company_id()
    OR (target_supplier_id IS NOT NULL
        AND target_supplier_id = current_user_company_id())
  );

-- 3) REQUEST-ATTACHMENTS bucket: require auth + restrict writes to owner
DROP POLICY IF EXISTS "Public Access" ON storage.objects;  -- if any leftover
DROP POLICY IF EXISTS "request_attachments_public_read" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_owner_delete" ON storage.objects;

UPDATE storage.buckets SET public = false WHERE id = 'request-attachments';

CREATE POLICY "request_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'request-attachments');

CREATE POLICY "request_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'request-attachments' AND owner = auth.uid());

CREATE POLICY "request_attachments_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'request-attachments' AND (owner = auth.uid() OR is_mundus_admin()));

CREATE POLICY "request_attachments_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'request-attachments' AND (owner = auth.uid() OR is_mundus_admin()));
