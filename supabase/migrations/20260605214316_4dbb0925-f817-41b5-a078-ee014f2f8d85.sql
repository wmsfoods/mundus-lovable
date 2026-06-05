CREATE POLICY companies_select_linked_supplier
ON public.companies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.supplier_customer_links scl
    LEFT JOIN public.companies office ON office.id = scl.supplier_office_id
    WHERE scl.buyer_company_id IN (SELECT public.current_user_company_ids())
      AND (
        scl.supplier_office_id = companies.id
        OR office.parent_company_id = companies.id
      )
  )
);