CREATE POLICY "Participants update proposal status"
ON public.negotiation_messages
FOR UPDATE
TO authenticated
USING (
  negotiation_id IN (
    SELECT n.id FROM public.negotiations n
    WHERE n.buyer_company_id = (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1
    )
    OR n.offer_id IN (
      SELECT id FROM public.offers WHERE supplier_id = (
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1
      )
    )
  )
)
WITH CHECK (
  negotiation_id IN (
    SELECT n.id FROM public.negotiations n
    WHERE n.buyer_company_id = (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1
    )
    OR n.offer_id IN (
      SELECT id FROM public.offers WHERE supplier_id = (
        SELECT company_id FROM public.company_users WHERE user_id = auth.uid() LIMIT 1
      )
    )
  )
);