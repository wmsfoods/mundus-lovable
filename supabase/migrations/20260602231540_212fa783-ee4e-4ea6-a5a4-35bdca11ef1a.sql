-- =============================================================
-- Função central: vincula um auth user a sua user_request aprovada.
-- Idempotente. Pode ser chamada de triggers e RPCs.
-- =============================================================
CREATE OR REPLACE FUNCTION public.link_approved_user_request_by_email(p_email text)
RETURNS TABLE(user_id uuid, company_id uuid, request_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email,'')));
  v_uid uuid;
  v_meta jsonb;
  v_req record;
  v_full_name text;
  v_role_text text;
  v_role_id uuid;
  v_is_supplier boolean;
  v_hq_office uuid;
BEGIN
  IF v_email = '' THEN
    RETURN;
  END IF;

  SELECT au.id, au.raw_user_meta_data INTO v_uid, v_meta
    FROM auth.users au
   WHERE lower(au.email) = v_email
   ORDER BY au.created_at DESC
   LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_req
    FROM public.user_requests
   WHERE lower(email) = v_email
     AND status = 'approved'
     AND (created_user_id IS NULL OR created_user_id = v_uid)
   ORDER BY reviewed_at DESC NULLS LAST, created_at DESC
   LIMIT 1;

  IF NOT FOUND OR v_req.company_id IS NULL THEN
    RETURN;
  END IF;

  v_full_name := COALESCE(
    NULLIF(v_meta->>'full_name',''),
    NULLIF(v_meta->>'name',''),
    v_req.name,
    split_part(v_email,'@',1)
  );

  -- public.users
  INSERT INTO public.users (id, email, name, company_id, active_company_id,
                            user_type, is_owner, status)
  VALUES (v_uid, v_email, v_full_name, v_req.company_id, v_req.company_id,
          'Master', true, 'active')
  ON CONFLICT (id) DO UPDATE
    SET company_id        = COALESCE(public.users.company_id, EXCLUDED.company_id),
        active_company_id = COALESCE(public.users.active_company_id, EXCLUDED.active_company_id),
        name              = COALESCE(NULLIF(public.users.name,''), EXCLUDED.name),
        email             = COALESCE(public.users.email, EXCLUDED.email),
        user_type         = COALESCE(public.users.user_type, EXCLUDED.user_type),
        is_owner          = COALESCE(public.users.is_owner, EXCLUDED.is_owner),
        status            = COALESCE(public.users.status, EXCLUDED.status);

  -- Decide papel: supplier ou buyer master
  v_is_supplier := EXISTS (
    SELECT 1 FROM public.companies c
     WHERE c.id = v_req.company_id
       AND COALESCE(c.is_supplier,false) = true
  );
  v_role_text := CASE WHEN v_is_supplier THEN 'master_supplier' ELSE 'master_buyer' END;
  SELECT id INTO v_role_id FROM public.roles WHERE name = v_role_text LIMIT 1;

  -- company_users (idempotente por company_id+email)
  BEGIN
    INSERT INTO public.company_users (
      company_id, user_id, email, full_name, role, role_id,
      status, accepted_at, joined_at
    ) VALUES (
      v_req.company_id, v_uid, v_email, v_full_name, v_role_text, v_role_id,
      'active', now(), now()
    )
    ON CONFLICT (company_id, email) DO UPDATE
      SET user_id     = COALESCE(public.company_users.user_id, EXCLUDED.user_id),
          full_name   = COALESCE(NULLIF(public.company_users.full_name,''), EXCLUDED.full_name),
          role        = COALESCE(public.company_users.role, EXCLUDED.role),
          role_id     = COALESCE(public.company_users.role_id, EXCLUDED.role_id),
          status      = 'active',
          accepted_at = COALESCE(public.company_users.accepted_at, EXCLUDED.accepted_at),
          joined_at   = COALESCE(public.company_users.joined_at, EXCLUDED.joined_at);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- user_offices (HQ da empresa aprovada)
  SELECT id INTO v_hq_office
    FROM public.companies
   WHERE (id = v_req.company_id OR parent_company_id = v_req.company_id)
     AND COALESCE(office_type,'headquarters') = 'headquarters'
   ORDER BY (id = v_req.company_id) DESC
   LIMIT 1;

  BEGIN
    INSERT INTO public.user_offices (user_id, company_id, role, is_primary)
    VALUES (v_uid, COALESCE(v_hq_office, v_req.company_id), 'office_admin', true)
    ON CONFLICT (user_id, company_id) DO UPDATE
      SET role       = COALESCE(public.user_offices.role, EXCLUDED.role),
          is_primary = COALESCE(public.user_offices.is_primary, EXCLUDED.is_primary);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- marca request como vinculada
  UPDATE public.user_requests
     SET created_user_id = v_uid
   WHERE id = v_req.id
     AND created_user_id IS DISTINCT FROM v_uid;

  RETURN QUERY SELECT v_uid, v_req.company_id, v_req.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_approved_user_request_by_email(text) TO authenticated, service_role;

-- =============================================================
-- Trigger em auth.users: chama a função central
-- =============================================================
CREATE OR REPLACE FUNCTION public.tg_link_approved_user_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM public.link_approved_user_request_by_email(NEW.email);
  EXCEPTION WHEN OTHERS THEN
    -- nunca bloquear signup
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_approved_user_request ON auth.users;
CREATE TRIGGER link_approved_user_request
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.tg_link_approved_user_request();

-- =============================================================
-- Trigger em user_requests: dispara o vínculo quando virar approved
-- (cobre o caso "signup primeiro, aprovação depois", como Gustavo)
-- =============================================================
CREATE OR REPLACE FUNCTION public.tg_user_requests_link_on_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved'
     AND NEW.email IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR OLD.status IS DISTINCT FROM NEW.status
          OR OLD.company_id IS DISTINCT FROM NEW.company_id) THEN
    BEGIN
      PERFORM public.link_approved_user_request_by_email(NEW.email);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_on_user_request_approve ON public.user_requests;
CREATE TRIGGER link_on_user_request_approve
AFTER INSERT OR UPDATE OF status, company_id ON public.user_requests
FOR EACH ROW
EXECUTE FUNCTION public.tg_user_requests_link_on_approve();

-- =============================================================
-- Reforço no claim_pending_invites: além de company_users invitados,
-- tenta também vincular user_requests aprovadas no login.
-- =============================================================
CREATE OR REPLACE FUNCTION public.claim_pending_invites()
RETURNS TABLE(claimed_count integer, first_company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_first uuid;
  v_count integer := 0;
  v_linked record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT 0, NULL::uuid;
    RETURN;
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RETURN QUERY SELECT 0, NULL::uuid;
    RETURN;
  END IF;

  -- 1) Vincula company_users invitados (fluxo de convite direto)
  WITH updated AS (
    UPDATE public.company_users
       SET user_id     = v_uid,
           status      = CASE WHEN status IN ('invited','pending') THEN 'active' ELSE status END,
           accepted_at = COALESCE(accepted_at, now()),
           joined_at   = COALESCE(joined_at, now()),
           updated_at  = now()
     WHERE user_id IS NULL
       AND lower(email) = v_email
    RETURNING company_id
  )
  SELECT count(*)::int, min(company_id) INTO v_count, v_first FROM updated;

  -- backfill public.users com o primeiro company se necessário
  IF v_count > 0 AND v_first IS NOT NULL THEN
    INSERT INTO public.users (id, company_id)
    VALUES (v_uid, v_first)
    ON CONFLICT (id) DO UPDATE
      SET company_id = COALESCE(public.users.company_id, EXCLUDED.company_id);
  END IF;

  -- 2) Vincula user_request aprovada (fluxo signup -> aprovação)
  BEGIN
    SELECT * INTO v_linked
      FROM public.link_approved_user_request_by_email(v_email)
     LIMIT 1;
    IF v_linked.company_id IS NOT NULL THEN
      v_count := v_count + 1;
      v_first := COALESCE(v_first, v_linked.company_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN QUERY SELECT v_count, v_first;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_pending_invites() TO authenticated;

-- =============================================================
-- Hotfix Gustavo: força vínculo agora
-- =============================================================
SELECT public.link_approved_user_request_by_email('gustavo.agostinho.candido@gmail.com');
