
-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'bl-documents';

-- Drop old permissive policies if present
DROP POLICY IF EXISTS "bl_docs_public_read" ON storage.objects;
DROP POLICY IF EXISTS "bl_docs_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "bl_docs_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "bl_docs_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "bl_docs_party_select" ON storage.objects;
DROP POLICY IF EXISTS "bl_docs_party_write" ON storage.objects;
DROP POLICY IF EXISTS "bl_docs_party_update" ON storage.objects;
DROP POLICY IF EXISTS "bl_docs_party_delete" ON storage.objects;

-- Helper: path layout is `<order_id>/<container_id>/<file>`
-- so (storage.foldername(name))[1] = order_id

CREATE POLICY "bl_docs_party_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'bl-documents'
    AND (
      public.is_mundus_admin() OR EXISTS (
        SELECT 1 FROM public.orders o
        LEFT JOIN public.offers of ON of.id = o.offer_id
        WHERE o.id::text = (storage.foldername(name))[1]
          AND (o.buyer_company_id = public.current_user_company_id()
               OR of.supplier_id = public.current_user_company_id())
      )
    )
  );

CREATE POLICY "bl_docs_party_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bl-documents'
    AND (
      public.is_mundus_admin() OR EXISTS (
        SELECT 1 FROM public.orders o
        LEFT JOIN public.offers of ON of.id = o.offer_id
        WHERE o.id::text = (storage.foldername(name))[1]
          AND (o.buyer_company_id = public.current_user_company_id()
               OR of.supplier_id = public.current_user_company_id())
      )
    )
  );

CREATE POLICY "bl_docs_party_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'bl-documents'
    AND (
      public.is_mundus_admin() OR EXISTS (
        SELECT 1 FROM public.orders o
        LEFT JOIN public.offers of ON of.id = o.offer_id
        WHERE o.id::text = (storage.foldername(name))[1]
          AND (o.buyer_company_id = public.current_user_company_id()
               OR of.supplier_id = public.current_user_company_id())
      )
    )
  );

CREATE POLICY "bl_docs_party_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'bl-documents'
    AND (
      public.is_mundus_admin() OR EXISTS (
        SELECT 1 FROM public.orders o
        LEFT JOIN public.offers of ON of.id = o.offer_id
        WHERE o.id::text = (storage.foldername(name))[1]
          AND (o.buyer_company_id = public.current_user_company_id()
               OR of.supplier_id = public.current_user_company_id())
      )
    )
  );
