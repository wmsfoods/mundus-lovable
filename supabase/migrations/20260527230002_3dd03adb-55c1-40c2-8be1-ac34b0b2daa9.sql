CREATE OR REPLACE FUNCTION public.user_can_access_negotiation(p_negotiation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.is_mundus_admin()
  OR EXISTS (
    SELECT 1
    FROM public.negotiations n
    JOIN public.offers o ON o.id = n.offer_id
    LEFT JOIN public.users u ON u.id = auth.uid()
    WHERE n.id = p_negotiation_id
      AND (
        COALESCE(u.active_company_id, u.company_id) = n.buyer_company_id
        OR COALESCE(u.active_company_id, u.company_id) = o.supplier_id
        OR EXISTS (
          SELECT 1
          FROM public.company_users cu
          WHERE cu.user_id = auth.uid()
            AND cu.status = 'active'
            AND cu.company_id IN (n.buyer_company_id, o.supplier_id)
        )
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(active_company_id, company_id)
  FROM public.users
  WHERE id = auth.uid();
$function$;

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
      SELECT 1
      FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = negotiations.buyer_company_id
        AND cu.status = 'active'
    )
  )
);