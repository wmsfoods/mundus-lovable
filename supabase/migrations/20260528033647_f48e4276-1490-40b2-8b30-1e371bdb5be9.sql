CREATE OR REPLACE FUNCTION public.current_user_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.company_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.company_id IS NOT NULL

  UNION

  SELECT u.active_company_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.active_company_id IS NOT NULL

  UNION

  SELECT cu.company_id
  FROM public.company_users cu
  WHERE cu.user_id = auth.uid()
    AND cu.company_id IS NOT NULL
    AND COALESCE(cu.status, 'active') = 'active'
$$;

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
      OR p_buyer_company_id IN (SELECT public.current_user_company_ids())
    );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_company_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_company_ids() TO service_role;
GRANT EXECUTE ON FUNCTION public.user_can_create_negotiation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_create_negotiation(uuid, uuid) TO service_role;

DROP POLICY IF EXISTS neg_insert ON public.negotiations;

CREATE POLICY neg_insert
ON public.negotiations
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_can_create_negotiation(buyer_company_id, created_by_user_id)
);