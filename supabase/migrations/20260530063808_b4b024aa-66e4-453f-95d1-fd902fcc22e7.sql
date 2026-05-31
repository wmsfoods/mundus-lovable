
-- 1) Register the new buyer global director role
INSERT INTO public.roles (name)
SELECT 'buyer_global_director'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'buyer_global_director');

-- 2) Widen the family-director helper to accept either supplier or buyer director
CREATE OR REPLACE FUNCTION public.is_family_global_director(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    LEFT JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
      AND COALESCE(cu.status,'active') = 'active'
      AND cu.company_id = public.company_family_root(p_company_id)
      AND (
        r.name IN ('supplier_global_director','buyer_global_director')
        OR cu.role IN ('supplier_global_director','buyer_global_director')
      )
  );
$function$;

-- 3) Buyer-side scope helper (mirror of user_supplier_scope_ids)
CREATE OR REPLACE FUNCTION public.user_buyer_scope_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH my_companies AS (
    SELECT cu.company_id
      FROM public.company_users cu
     WHERE cu.user_id = auth.uid()
       AND COALESCE(cu.status,'active') = 'active'
       AND cu.company_id IS NOT NULL
    UNION
    SELECT uo.company_id
      FROM public.user_offices uo
     WHERE uo.user_id = auth.uid()
       AND uo.company_id IS NOT NULL
    UNION
    SELECT u.company_id
      FROM public.users u
     WHERE u.id = auth.uid() AND u.company_id IS NOT NULL
    UNION
    SELECT u.active_company_id
      FROM public.users u
     WHERE u.id = auth.uid() AND u.active_company_id IS NOT NULL
  )
  SELECT DISTINCT mc.company_id
    FROM my_companies mc
   WHERE NOT public.is_family_global_director(mc.company_id)
  UNION
  SELECT DISTINCT fid
    FROM my_companies mc,
         LATERAL public.company_family_ids(mc.company_id) AS fid
   WHERE public.is_family_global_director(mc.company_id);
$function$;

GRANT EXECUTE ON FUNCTION public.user_buyer_scope_ids() TO authenticated, service_role;

-- 4) Widen buyer_requests policies to use buyer-family scope
DROP POLICY IF EXISTS buyer_requests_insert_owner_or_admin ON public.buyer_requests;
DROP POLICY IF EXISTS buyer_requests_update_owner_or_admin ON public.buyer_requests;
DROP POLICY IF EXISTS buyer_requests_delete_owner_or_admin ON public.buyer_requests;
DROP POLICY IF EXISTS buyer_requests_select_scoped ON public.buyer_requests;

CREATE POLICY buyer_requests_insert_owner_or_admin ON public.buyer_requests
FOR INSERT TO authenticated
WITH CHECK (
  public.is_mundus_admin()
  OR buyer_company_id IN (SELECT public.user_buyer_scope_ids())
);

CREATE POLICY buyer_requests_update_owner_or_admin ON public.buyer_requests
FOR UPDATE TO authenticated
USING (
  public.is_mundus_admin()
  OR buyer_company_id IN (SELECT public.user_buyer_scope_ids())
)
WITH CHECK (
  public.is_mundus_admin()
  OR buyer_company_id IN (SELECT public.user_buyer_scope_ids())
);

CREATE POLICY buyer_requests_delete_owner_or_admin ON public.buyer_requests
FOR DELETE TO authenticated
USING (
  public.is_mundus_admin()
  OR buyer_company_id IN (SELECT public.user_buyer_scope_ids())
);

-- Rebuild the SELECT policy: same as before, but the buyer-side branch uses family scope
CREATE POLICY buyer_requests_select_scoped ON public.buyer_requests
FOR SELECT TO authenticated
USING (
  public.is_mundus_admin()
  OR buyer_company_id IN (SELECT public.user_buyer_scope_ids())
  OR (
    target_supplier_id IS NULL
    AND COALESCE(status, '') NOT IN ('draft','cancelled','archived')
  )
  OR (
    target_supplier_id IS NOT NULL
    AND NOT public.is_family_hq(target_supplier_id)
    AND target_supplier_id IN (SELECT public.user_supplier_scope_ids())
  )
  OR (
    target_supplier_id IS NOT NULL
    AND public.is_family_hq(target_supplier_id)
    AND (
      public.is_family_global_director(target_supplier_id)
      OR public.is_family_hq_member(target_supplier_id)
    )
  )
  OR (
    assigned_office_id IS NOT NULL
    AND assigned_office_id IN (SELECT public.user_supplier_scope_ids())
  )
);

-- 5) Widen orders SELECT to use buyer-family scope (keep admin + supplier branches)
DROP POLICY IF EXISTS orders_select_parties_or_admin ON public.orders;
CREATE POLICY orders_select_parties_or_admin ON public.orders
FOR SELECT TO authenticated
USING (
  public.is_mundus_admin()
  OR buyer_company_id IN (SELECT public.user_buyer_scope_ids())
  OR EXISTS (
    SELECT 1 FROM public.offers o
     WHERE o.id = orders.offer_id
       AND o.supplier_id IN (SELECT public.user_supplier_scope_ids())
  )
);

-- 6) Widen negotiation visibility for the buyer side (supplier + admin branches untouched)
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
    WHERE n.id = p_negotiation_id
      AND (
        n.buyer_company_id IN (SELECT public.user_buyer_scope_ids())
        OR o.supplier_id IN (SELECT public.user_supplier_scope_ids())
      )
  );
$function$;
