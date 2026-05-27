CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT COALESCE(u.active_company_id, u.company_id)
     FROM public.users u
     WHERE u.id = auth.uid()),
    (SELECT cu.company_id
     FROM public.company_users cu
     WHERE cu.user_id = auth.uid()
       AND COALESCE(cu.status, 'active') = 'active'
     ORDER BY cu.accepted_at DESC NULLS LAST, cu.joined_at DESC NULLS LAST, cu.created_at DESC NULLS LAST
     LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_mundus_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM public.company_users cu
    LEFT JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = '00000000-0000-beef-0000-000000000001'::uuid
      AND COALESCE(cu.status, 'active') = 'active'
      AND (
        r.name IN ('mundus_admin', 'mundus_ops', 'mundus_sales', 'mundus_support')
        OR cu.role IN ('mundus_admin', 'mundus_ops', 'mundus_sales', 'mundus_support')
      )
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_negotiation(p_negotiation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_mundus_admin()
  OR EXISTS (
    SELECT 1
    FROM public.negotiations n
    JOIN public.offers o ON o.id = n.offer_id
    WHERE n.id = p_negotiation_id
      AND (
        public.current_user_company_id() IN (n.buyer_company_id, o.supplier_id)
        OR EXISTS (
          SELECT 1
          FROM public.company_users cu
          WHERE cu.user_id = auth.uid()
            AND COALESCE(cu.status, 'active') = 'active'
            AND cu.company_id IN (n.buyer_company_id, o.supplier_id)
        )
      )
  );
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
      OR public.current_user_company_id() = p_buyer_company_id
      OR EXISTS (
        SELECT 1
        FROM public.company_users cu
        WHERE cu.user_id = auth.uid()
          AND cu.company_id = p_buyer_company_id
          AND COALESCE(cu.status, 'active') = 'active'
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
