
SET session_replication_role = replica;

-- 1) Novo role
INSERT INTO public.roles (id, name, is_system)
SELECT gen_random_uuid(), 'mundus_master_admin', true
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'mundus_master_admin');

-- 2) Remover conta órfã 'fn@mundustrade.com' do auth
DO $$
DECLARE v_orphan uuid;
BEGIN
  SELECT au.id INTO v_orphan
  FROM auth.users au
  WHERE au.email = 'fn@mundustrade.com'
    AND au.id <> '935eac55-38f0-4543-bf9f-a209570c63cc'
    AND NOT EXISTS (SELECT 1 FROM public.users pu WHERE pu.id = au.id)
    AND NOT EXISTS (SELECT 1 FROM public.company_users cu WHERE cu.user_id = au.id);
  IF v_orphan IS NOT NULL THEN
    DELETE FROM auth.identities WHERE user_id = v_orphan;
    DELETE FROM auth.users WHERE id = v_orphan;
  END IF;
END $$;

-- 3) Renomear
UPDATE auth.users
SET email = 'fn@mundustrade.com',
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email','fn@mundustrade.com'),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE id = '935eac55-38f0-4543-bf9f-a209570c63cc';

UPDATE auth.identities
SET identity_data = COALESCE(identity_data,'{}'::jsonb) || jsonb_build_object('email','fn@mundustrade.com')
WHERE user_id = '935eac55-38f0-4543-bf9f-a209570c63cc';

UPDATE public.users SET email = 'fn@mundustrade.com'
WHERE id = '935eac55-38f0-4543-bf9f-a209570c63cc';

UPDATE public.company_users SET email = 'fn@mundustrade.com'
WHERE user_id = '935eac55-38f0-4543-bf9f-a209570c63cc';

-- 4) Promover fn -> Master Admin (apenas via role_id; campo livre 'role' fica null por causa da check)
UPDATE public.company_users
SET role_id = (SELECT id FROM public.roles WHERE name = 'mundus_master_admin' LIMIT 1),
    role   = NULL,
    status = 'active'
WHERE user_id = '935eac55-38f0-4543-bf9f-a209570c63cc'
  AND company_id = '00000000-0000-beef-0000-000000000001';

-- 5) Ativar g.agostinho
UPDATE public.company_users
SET status = 'active'
WHERE user_id = '191f4294-6a49-4ff8-8e7b-45b2cd433c22'
  AND company_id = '00000000-0000-beef-0000-000000000001';

SET session_replication_role = origin;

-- 6) Guard incluindo master_admin
CREATE OR REPLACE FUNCTION public.tg_company_users_block_admin_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_role_name text;
BEGIN
  IF public.is_mundus_admin() THEN RETURN NEW; END IF;
  IF NEW.role_id IS NOT NULL THEN
    SELECT name INTO v_role_name FROM public.roles WHERE id = NEW.role_id;
    IF v_role_name IN ('mundus_master_admin','mundus_admin','mundus_ops','mundus_sales','mundus_support') THEN
      RAISE EXCEPTION 'cannot_assign_mundus_role' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NEW.role IS NOT NULL
     AND NEW.role IN ('mundus_master_admin','mundus_admin','mundus_ops','mundus_sales','mundus_support') THEN
    RAISE EXCEPTION 'cannot_assign_mundus_role' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'cannot_change_company_membership' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

-- 7) Helpers
CREATE OR REPLACE FUNCTION public.is_mundus_master_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1 FROM public.company_users cu
    LEFT JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = '00000000-0000-beef-0000-000000000001'::uuid
      AND COALESCE(cu.status,'active') = 'active'
      AND (r.name = 'mundus_master_admin' OR cu.role = 'mundus_master_admin')
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.is_mundus_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1 FROM public.company_users cu
    LEFT JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = '00000000-0000-beef-0000-000000000001'::uuid
      AND COALESCE(cu.status,'active') = 'active'
      AND (
        r.name IN ('mundus_master_admin','mundus_admin','mundus_ops','mundus_sales','mundus_support')
        OR cu.role IN ('mundus_master_admin','mundus_admin','mundus_ops','mundus_sales','mundus_support')
      )
  ), false);
$$;

-- 8) Dependências antes de deletar uma company
CREATE OR REPLACE FUNCTION public.get_company_delete_blockers(p_company_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_users int; v_company_users int; v_offers int;
  v_negotiations_buy int; v_orders_buy int; v_orders_sell int;
  v_buyer_requests int; v_auctions int; v_invites int;
BEGIN
  IF NOT public.is_mundus_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT count(*) INTO v_users FROM public.users WHERE company_id = p_company_id;
  SELECT count(*) INTO v_company_users FROM public.company_users WHERE company_id = p_company_id AND user_id IS NOT NULL;
  SELECT count(*) INTO v_offers FROM public.offers WHERE supplier_id = p_company_id;
  SELECT count(*) INTO v_negotiations_buy FROM public.negotiations WHERE buyer_company_id = p_company_id;
  SELECT count(*) INTO v_orders_buy FROM public.orders WHERE buyer_company_id = p_company_id;
  SELECT count(*) INTO v_orders_sell FROM public.orders WHERE supplier_company_id = p_company_id;
  SELECT count(*) INTO v_buyer_requests FROM public.buyer_requests WHERE buyer_company_id = p_company_id;
  SELECT count(*) INTO v_auctions FROM public.auctions WHERE supplier_id = p_company_id;
  SELECT count(*) INTO v_invites FROM public.company_users WHERE company_id = p_company_id AND user_id IS NULL;
  RETURN jsonb_build_object(
    'users', v_users, 'company_users', v_company_users, 'offers', v_offers,
    'negotiations_as_buyer', v_negotiations_buy,
    'orders_as_buyer', v_orders_buy, 'orders_as_supplier', v_orders_sell,
    'buyer_requests', v_buyer_requests, 'auctions', v_auctions, 'pending_invites', v_invites,
    'can_delete', (
      v_users = 0 AND v_company_users = 0 AND v_offers = 0
      AND v_negotiations_buy = 0 AND v_orders_buy = 0 AND v_orders_sell = 0
      AND v_buyer_requests = 0 AND v_auctions = 0
    )
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.is_mundus_master_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_delete_blockers(uuid) TO authenticated;
