DROP POLICY IF EXISTS neg_insert ON public.negotiations;

CREATE POLICY neg_insert
ON public.negotiations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by_user_id = auth.uid()
  AND (
    -- mundus admin shortcut
    EXISTS (
      SELECT 1 FROM public.company_users cu
      LEFT JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.user_id = auth.uid()
        AND COALESCE(cu.status,'active') = 'active'
        AND (
          r.name IN ('mundus_admin','mundus_ops','mundus_sales','mundus_support')
          OR cu.role IN ('mundus_admin','mundus_ops','mundus_sales','mundus_support')
        )
    )
    -- user's primary or active company matches buyer_company_id
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND COALESCE(u.active_company_id, u.company_id) = buyer_company_id
    )
    -- or user is an active member of the buyer company
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = buyer_company_id
        AND COALESCE(cu.status,'active') = 'active'
    )
  )
);