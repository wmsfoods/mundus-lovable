
-- Allow company masters to manage logos stored under avatars/companies/<companyId>/...
CREATE POLICY "Avatars company master insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'companies'
  AND public.is_company_master(((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Avatars company master update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'companies'
  AND public.is_company_master(((storage.foldername(name))[2])::uuid)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'companies'
  AND public.is_company_master(((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Avatars company master delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'companies'
  AND public.is_company_master(((storage.foldername(name))[2])::uuid)
);
