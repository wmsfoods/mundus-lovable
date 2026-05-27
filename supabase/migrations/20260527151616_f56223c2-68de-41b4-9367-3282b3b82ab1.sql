
-- Outreach CRM (admin-only)
DROP POLICY IF EXISTS "auth all outreach_campaigns" ON public.outreach_campaigns;
DROP POLICY IF EXISTS "auth all outreach_recipients" ON public.outreach_recipients;
DROP POLICY IF EXISTS "outreach_emails_public_all" ON public.outreach_emails;
DROP POLICY IF EXISTS "auth all outreach_templates" ON public.outreach_templates;

CREATE POLICY "outreach_campaigns_admin_all" ON public.outreach_campaigns FOR ALL TO authenticated
  USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());
CREATE POLICY "outreach_recipients_admin_all" ON public.outreach_recipients FOR ALL TO authenticated
  USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());
CREATE POLICY "outreach_emails_admin_all" ON public.outreach_emails FOR ALL TO authenticated
  USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());
CREATE POLICY "outreach_templates_admin_all" ON public.outreach_templates FOR ALL TO authenticated
  USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- Port sharing (public read, admin write)
DROP POLICY IF EXISTS "port_sharing_public_all" ON public.port_sharing;
CREATE POLICY "port_sharing_read_all" ON public.port_sharing FOR SELECT USING (true);
CREATE POLICY "port_sharing_write_admin" ON public.port_sharing FOR ALL TO authenticated
  USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

-- Prospect phone reveals (admin read only; service role still writes)
DROP POLICY IF EXISTS "auth read phone reveals" ON public.prospect_phone_reveals;
DROP POLICY IF EXISTS "prospect_phone_reveals_service_all" ON public.prospect_phone_reveals;
-- Keep existing prospect_phone_reveals_admin_select. Service role bypasses RLS so no policy needed for it.

-- Email verifications (restrict reads to admin; allow public insert for verify flow)
DROP POLICY IF EXISTS "Anyone can verify" ON public.email_verifications;
CREATE POLICY "email_verifications_public_insert" ON public.email_verifications FOR INSERT WITH CHECK (true);
CREATE POLICY "email_verifications_admin_select" ON public.email_verifications FOR SELECT TO authenticated
  USING (public.is_mundus_admin());
CREATE POLICY "email_verifications_admin_write" ON public.email_verifications FOR UPDATE TO authenticated
  USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());
CREATE POLICY "email_verifications_admin_delete" ON public.email_verifications FOR DELETE TO authenticated
  USING (public.is_mundus_admin());

-- App notifications (tighten insert)
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.app_notifications;
CREATE POLICY "app_notifications_insert_self_or_admin" ON public.app_notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_mundus_admin() OR user_id = auth.uid());
