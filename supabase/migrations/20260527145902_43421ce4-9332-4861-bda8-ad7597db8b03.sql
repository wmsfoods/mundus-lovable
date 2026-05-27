
-- =========================================================
-- SPRINT 1 — Critical security hardening
-- =========================================================

-- ---------- Helper: is the caller a master/owner of a company? ----------
CREATE OR REPLACE FUNCTION public.is_company_master(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users cu
    LEFT JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = _company_id
      AND cu.status = 'active'
      AND (
        r.name IN ('master_buyer','master_supplier','mundus_admin')
        OR cu.role IN ('master_buyer','master_supplier')
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.company_id = _company_id AND u.is_owner = true
  );
$$;

-- =========================================================
-- 12) USERS — prevent impersonation
-- =========================================================
DROP POLICY IF EXISTS users_public_all ON public.users;

-- Block any change to company_id (and a few other identity fields) by non-admins
CREATE OR REPLACE FUNCTION public.tg_users_prevent_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_mundus_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'cannot_change_company_id' USING ERRCODE = '42501';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'cannot_change_user_id' USING ERRCODE = '42501';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email AND NEW.id <> auth.uid() THEN
    RAISE EXCEPTION 'cannot_change_other_user_email' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_prevent_identity_change ON public.users;
CREATE TRIGGER users_prevent_identity_change
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.tg_users_prevent_identity_change();

CREATE POLICY "users_select_same_company_or_admin"
ON public.users FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR company_id = public.current_user_company_id()
  OR public.is_mundus_admin()
);

CREATE POLICY "users_update_self_or_admin"
ON public.users FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_mundus_admin())
WITH CHECK (id = auth.uid() OR public.is_mundus_admin());

CREATE POLICY "users_insert_admin_only"
ON public.users FOR INSERT TO authenticated
WITH CHECK (public.is_mundus_admin());

CREATE POLICY "users_delete_admin_only"
ON public.users FOR DELETE TO authenticated
USING (public.is_mundus_admin());

-- =========================================================
-- 11) COMPANY_USERS — prevent privilege escalation
-- =========================================================
DROP POLICY IF EXISTS company_users_public_all ON public.company_users;

-- Block anyone who is not already a Mundus admin from assigning the mundus_admin role
CREATE OR REPLACE FUNCTION public.tg_company_users_block_admin_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name text;
BEGIN
  IF public.is_mundus_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.role_id IS NOT NULL THEN
    SELECT name INTO v_role_name FROM public.roles WHERE id = NEW.role_id;
    IF v_role_name IN ('mundus_admin','mundus_ops','mundus_sales','mundus_support') THEN
      RAISE EXCEPTION 'cannot_assign_mundus_role' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NEW.role IS NOT NULL
     AND NEW.role IN ('mundus_admin','mundus_ops','mundus_sales','mundus_support') THEN
    RAISE EXCEPTION 'cannot_assign_mundus_role' USING ERRCODE = '42501';
  END IF;
  -- Members cannot move themselves to another company
  IF TG_OP = 'UPDATE' AND NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'cannot_change_company_membership' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS company_users_block_admin_escalation ON public.company_users;
CREATE TRIGGER company_users_block_admin_escalation
BEFORE INSERT OR UPDATE ON public.company_users
FOR EACH ROW EXECUTE FUNCTION public.tg_company_users_block_admin_escalation();

CREATE POLICY "company_users_select_same_company_or_admin"
ON public.company_users FOR SELECT TO authenticated
USING (
  company_id = public.current_user_company_id()
  OR user_id = auth.uid()
  OR public.is_mundus_admin()
);

CREATE POLICY "company_users_insert_master_or_admin"
ON public.company_users FOR INSERT TO authenticated
WITH CHECK (
  public.is_mundus_admin()
  OR public.is_company_master(company_id)
);

CREATE POLICY "company_users_update_master_or_admin"
ON public.company_users FOR UPDATE TO authenticated
USING (
  public.is_mundus_admin()
  OR public.is_company_master(company_id)
  OR user_id = auth.uid()
)
WITH CHECK (
  public.is_mundus_admin()
  OR public.is_company_master(company_id)
  OR user_id = auth.uid()
);

CREATE POLICY "company_users_delete_master_or_admin"
ON public.company_users FOR DELETE TO authenticated
USING (
  public.is_mundus_admin()
  OR public.is_company_master(company_id)
);

-- =========================================================
-- 13) ORDERS — scope by company
-- =========================================================
DROP POLICY IF EXISTS orders_public_all ON public.orders;

CREATE POLICY "orders_select_parties_or_admin"
ON public.orders FOR SELECT TO authenticated
USING (
  public.is_mundus_admin()
  OR buyer_company_id = public.current_user_company_id()
  OR EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = orders.offer_id
      AND o.supplier_id = public.current_user_company_id()
  )
);

-- Inserts happen through the SECURITY DEFINER RPC accept_negotiation; restrict direct inserts to admins
CREATE POLICY "orders_insert_admin_only"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (public.is_mundus_admin());

CREATE POLICY "orders_update_parties_or_admin"
ON public.orders FOR UPDATE TO authenticated
USING (
  public.is_mundus_admin()
  OR buyer_company_id = public.current_user_company_id()
  OR EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = orders.offer_id
      AND o.supplier_id = public.current_user_company_id()
  )
)
WITH CHECK (
  public.is_mundus_admin()
  OR buyer_company_id = public.current_user_company_id()
  OR EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = orders.offer_id
      AND o.supplier_id = public.current_user_company_id()
  )
);

CREATE POLICY "orders_delete_admin_only"
ON public.orders FOR DELETE TO authenticated
USING (public.is_mundus_admin());
