
-- ============================================================
-- SPRINT 2 SECURITY: Lock down buyer_requests, negotiations,
-- round_proposals, CRM tables, and email_providers.
-- ============================================================

-- -------- buyer_requests ----------
DROP POLICY IF EXISTS buyer_requests_public_all ON public.buyer_requests;

-- Marketplace: any authenticated user can SEE buyer requests (suppliers browse them).
CREATE POLICY buyer_requests_select_authenticated
ON public.buyer_requests
FOR SELECT
TO authenticated
USING (true);

-- Only the owning buyer company (or admin) can INSERT.
CREATE POLICY buyer_requests_insert_owner_or_admin
ON public.buyer_requests
FOR INSERT
TO authenticated
WITH CHECK (
  is_mundus_admin()
  OR buyer_company_id = current_user_company_id()
);

-- Only owner company (or admin) can UPDATE / soft-DELETE.
CREATE POLICY buyer_requests_update_owner_or_admin
ON public.buyer_requests
FOR UPDATE
TO authenticated
USING (
  is_mundus_admin()
  OR buyer_company_id = current_user_company_id()
)
WITH CHECK (
  is_mundus_admin()
  OR buyer_company_id = current_user_company_id()
);

CREATE POLICY buyer_requests_delete_owner_or_admin
ON public.buyer_requests
FOR DELETE
TO authenticated
USING (
  is_mundus_admin()
  OR buyer_company_id = current_user_company_id()
);

-- -------- negotiations ----------
DROP POLICY IF EXISTS negotiations_public_all ON public.negotiations;
-- existing neg_select / neg_insert / neg_update remain.
-- Add admin coverage + delete restriction.
DROP POLICY IF EXISTS negotiations_admin_all ON public.negotiations;
CREATE POLICY negotiations_admin_all
ON public.negotiations
FOR ALL
TO authenticated
USING (is_mundus_admin())
WITH CHECK (is_mundus_admin());

-- -------- round_proposals ----------
DROP POLICY IF EXISTS round_proposals_public_all ON public.round_proposals;
-- existing rp_select / rp_insert remain.
DROP POLICY IF EXISTS round_proposals_update_party_or_admin ON public.round_proposals;
CREATE POLICY round_proposals_update_party_or_admin
ON public.round_proposals
FOR UPDATE
TO authenticated
USING (is_mundus_admin() OR user_can_access_negotiation(negotiation_id))
WITH CHECK (is_mundus_admin() OR user_can_access_negotiation(negotiation_id));

DROP POLICY IF EXISTS round_proposals_admin_delete ON public.round_proposals;
CREATE POLICY round_proposals_admin_delete
ON public.round_proposals
FOR DELETE
TO authenticated
USING (is_mundus_admin());

-- -------- CRM tables (Mundus internal — admin only) ----------
-- Drop wide-open policies
DROP POLICY IF EXISTS crm_companies_public_all ON public.crm_companies;
DROP POLICY IF EXISTS crm_contacts_public_all ON public.crm_contacts;
DROP POLICY IF EXISTS crm_lists_public_all ON public.crm_lists;
DROP POLICY IF EXISTS crm_list_items_public_all ON public.crm_list_items;
DROP POLICY IF EXISTS crm_interviews_public_all ON public.crm_interviews;
DROP POLICY IF EXISTS crm_learnings_public_all ON public.crm_learnings;
DROP POLICY IF EXISTS crm_meeting_preps_public_all ON public.crm_meeting_preps;

-- Ensure admin_all exists on every CRM table
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_companies','crm_contacts','crm_activities','crm_lists','crm_list_members',
    'crm_list_items','crm_personas','crm_saved_searches','crm_interviews',
    'crm_learnings','crm_meeting_preps','crm_enrichment_jobs','crm_credit_usage','crm_import_logs'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin_all ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_admin_all ON public.%I FOR ALL TO authenticated USING (is_mundus_admin()) WITH CHECK (is_mundus_admin())',
      t, t
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END$$;

-- -------- email_providers (credentials / SMTP secrets) ----------
DROP POLICY IF EXISTS "auth all email_providers" ON public.email_providers;
DROP POLICY IF EXISTS email_providers_owner_select ON public.email_providers;
DROP POLICY IF EXISTS email_providers_owner_modify ON public.email_providers;
DROP POLICY IF EXISTS email_providers_admin_all ON public.email_providers;

CREATE POLICY email_providers_owner_select
ON public.email_providers
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_mundus_admin());

CREATE POLICY email_providers_owner_insert
ON public.email_providers
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR is_mundus_admin());

CREATE POLICY email_providers_owner_update
ON public.email_providers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR is_mundus_admin())
WITH CHECK (user_id = auth.uid() OR is_mundus_admin());

CREATE POLICY email_providers_owner_delete
ON public.email_providers
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR is_mundus_admin());

ALTER TABLE public.email_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_proposals  ENABLE ROW LEVEL SECURITY;
