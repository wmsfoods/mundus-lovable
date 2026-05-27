
DROP POLICY IF EXISTS email_verifications_auth_insert ON public.email_verifications;
CREATE POLICY email_verifications_auth_insert ON public.email_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    is_mundus_admin()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
