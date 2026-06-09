CREATE POLICY companies_select_negotiating_counterpart
ON public.companies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.negotiations n
    JOIN public.offers o ON o.id = n.offer_id
    WHERE n.buyer_company_id = companies.id
      AND o.supplier_id = public.current_user_company_id()
  )
);