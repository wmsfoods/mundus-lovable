
-- Add a user-scoped SELECT policy on email_verifications so people can only read their own codes.
DROP POLICY IF EXISTS email_verifications_self_select ON public.email_verifications;
CREATE POLICY email_verifications_self_select ON public.email_verifications
  FOR SELECT TO authenticated
  USING (
    is_mundus_admin()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
