
-- Verification codes: only admins can SELECT; edge functions use service role.
DROP POLICY IF EXISTS email_verifications_self_select ON public.email_verifications;

-- Email providers: drop owner SELECT to prevent client-side credential exposure.
DROP POLICY IF EXISTS email_providers_owner_select ON public.email_providers;
