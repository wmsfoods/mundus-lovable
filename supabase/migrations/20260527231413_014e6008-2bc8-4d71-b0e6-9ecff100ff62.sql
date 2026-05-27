CREATE OR REPLACE FUNCTION public.user_can_create_negotiation(
  p_buyer_company_id uuid,
  p_created_by_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND p_created_by_user_id = auth.uid()
    AND (
      public.is_mundus_admin()
      OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND COALESCE(u.active_company_id, u.company_id) = p_buyer_company_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
          AND cu.company_id = p_buyer_company_id
          AND cu.status = 'active'
      )
    );
$$;

DROP POLICY IF EXISTS neg_insert ON public.negotiations;

CREATE POLICY neg_insert
ON public.negotiations
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_can_create_negotiation(buyer_company_id, created_by_user_id)
);