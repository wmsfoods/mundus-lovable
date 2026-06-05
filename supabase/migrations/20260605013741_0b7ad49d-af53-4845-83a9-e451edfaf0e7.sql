
-- RLS policies for offer-item-media bucket
-- Path convention: {supplier_company_id}/{offer_id}/{cut_tempId}/{filename}

CREATE POLICY "offer_item_media_supplier_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'offer-item-media'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.current_user_company_ids())
  );

CREATE POLICY "offer_item_media_supplier_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'offer-item-media'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.current_user_company_ids())
  );

CREATE POLICY "offer_item_media_supplier_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'offer-item-media'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.current_user_company_ids())
  );

-- Any authenticated user can read (buyers need to see offer media).
CREATE POLICY "offer_item_media_authenticated_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'offer-item-media');
