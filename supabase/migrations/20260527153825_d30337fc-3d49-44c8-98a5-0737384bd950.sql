
CREATE POLICY email_providers_admin_select ON public.email_providers
  FOR SELECT TO authenticated
  USING (is_mundus_admin());
