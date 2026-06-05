
DROP POLICY IF EXISTS companies_select_linked_supplier ON public.companies;

CREATE OR REPLACE FUNCTION public.company_visible_via_supplier_link(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supplier_customer_links scl
    LEFT JOIN public.companies office ON office.id = scl.supplier_office_id
    WHERE scl.buyer_company_id IN (SELECT public.current_user_company_ids())
      AND (scl.supplier_office_id = _company_id OR office.parent_company_id = _company_id)
  );
$$;

CREATE POLICY companies_select_linked_supplier
ON public.companies
FOR SELECT
USING (public.company_visible_via_supplier_link(id));
