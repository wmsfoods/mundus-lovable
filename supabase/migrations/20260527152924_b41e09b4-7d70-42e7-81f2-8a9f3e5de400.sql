
-- Drop leftover permissive policies on request-attachments
DROP POLICY IF EXISTS "request_attachments_read" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "request_attachments_delete" ON storage.objects;

-- Tighten negotiation_tokens: supplier-side or admin only
DROP POLICY IF EXISTS negotiation_tokens_select_party ON public.negotiation_tokens;
CREATE POLICY negotiation_tokens_select_supplier ON public.negotiation_tokens
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin()
    OR EXISTS (
      SELECT 1 FROM negotiations n
      JOIN offers o ON o.id = n.offer_id
      WHERE n.id = negotiation_tokens.negotiation_id
        AND o.supplier_id = current_user_company_id()
    )
  );
