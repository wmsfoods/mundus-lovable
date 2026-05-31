
-- Allow buyers to insert negotiations when they belong to the buyer_company via
-- users.company_id, users.active_company_id, or an active company_users membership.

DROP POLICY IF EXISTS neg_insert ON public.negotiations;

CREATE POLICY neg_insert
ON public.negotiations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by_user_id = auth.uid()
  AND (
    buyer_company_id = (
      SELECT COALESCE(u.active_company_id, u.company_id)
      FROM public.users u
      WHERE u.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = buyer_company_id
        AND cu.status = 'active'
    )
  )
);
