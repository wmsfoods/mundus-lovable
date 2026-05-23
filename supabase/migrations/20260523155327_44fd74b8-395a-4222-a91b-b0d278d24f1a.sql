CREATE POLICY "company_files_signup_anon_insert"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'company-files'
  AND (storage.foldername(name))[1] = 'signup-requests'
);