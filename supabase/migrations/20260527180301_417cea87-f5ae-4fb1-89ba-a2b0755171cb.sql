
ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Storage policies: let mundus admins manage files in the public 'avatars' bucket
DROP POLICY IF EXISTS "Avatars mundus admin insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatars mundus admin update" ON storage.objects;
DROP POLICY IF EXISTS "Avatars mundus admin delete" ON storage.objects;

CREATE POLICY "Avatars mundus admin insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND public.is_mundus_admin());

CREATE POLICY "Avatars mundus admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND public.is_mundus_admin());

CREATE POLICY "Avatars mundus admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND public.is_mundus_admin());
