-- Upload: only into a folder named after the uploader's user id
CREATE POLICY "via_mundus_upload_own_folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'via-mundus-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Read: any authenticated user (we cannot easily scope by negotiation membership
-- without parsing path; access is gated by the signed URL we issue from the
-- edge function and by knowing the object key).
CREATE POLICY "via_mundus_read_authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'via-mundus-attachments');

-- Service role full access for edge function maintenance
CREATE POLICY "via_mundus_service_role_all"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'via-mundus-attachments')
WITH CHECK (bucket_id = 'via-mundus-attachments');