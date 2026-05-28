-- Allow company masters to manage their own company record and sub-offices.

CREATE POLICY companies_master_update_self
  ON public.companies
  FOR UPDATE TO authenticated
  USING (public.is_company_master(id))
  WITH CHECK (public.is_company_master(id));

CREATE POLICY companies_master_insert_child
  ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (
    parent_company_id IS NOT NULL
    AND public.is_company_master(parent_company_id)
  );

CREATE POLICY companies_master_update_child
  ON public.companies
  FOR UPDATE TO authenticated
  USING (parent_company_id IS NOT NULL AND public.is_company_master(parent_company_id))
  WITH CHECK (parent_company_id IS NOT NULL AND public.is_company_master(parent_company_id));

CREATE POLICY companies_master_delete_child
  ON public.companies
  FOR DELETE TO authenticated
  USING (parent_company_id IS NOT NULL AND public.is_company_master(parent_company_id));

CREATE POLICY companies_master_select_child
  ON public.companies
  FOR SELECT TO authenticated
  USING (parent_company_id IS NOT NULL AND public.is_company_master(parent_company_id));
