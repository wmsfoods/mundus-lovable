-- 1) updated_by column
ALTER TABLE public.company_users
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- 2) Trigger to auto-set updated_by (and updated_at) on insert/update
CREATE OR REPLACE FUNCTION public.tg_company_users_set_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS company_users_set_updated_by ON public.company_users;
CREATE TRIGGER company_users_set_updated_by
BEFORE INSERT OR UPDATE ON public.company_users
FOR EACH ROW EXECUTE FUNCTION public.tg_company_users_set_updated_by();

-- 3) Last-master protection
CREATE OR REPLACE FUNCTION public.is_last_master(p_company_id uuid, p_excluding_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.company_users cu
    LEFT JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.company_id = p_company_id
      AND COALESCE(cu.status,'active') = 'active'
      AND (cu.user_id IS DISTINCT FROM p_excluding_user_id)
      AND (
        cu.role IN ('master_buyer','master_supplier')
        OR r.name IN ('master_buyer','master_supplier')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.tg_company_users_protect_last_master()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_name text;
  v_is_master boolean;
BEGIN
  -- Protect DELETE
  IF TG_OP = 'DELETE' THEN
    SELECT name INTO v_role_name FROM public.roles WHERE id = OLD.role_id;
    v_is_master := (OLD.role IN ('master_buyer','master_supplier')
                    OR v_role_name IN ('master_buyer','master_supplier'));
    IF v_is_master AND COALESCE(OLD.status,'active') = 'active' THEN
      IF public.is_last_master(OLD.company_id, OLD.user_id) THEN
        RAISE EXCEPTION 'last_master_protected' USING ERRCODE = 'P0010',
          HINT = 'Promote another member to master before removing this one.';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  -- Protect UPDATE that demotes/inactivates the last master
  IF TG_OP = 'UPDATE' THEN
    -- Was master & active before?
    SELECT name INTO v_role_name FROM public.roles WHERE id = OLD.role_id;
    IF (OLD.role IN ('master_buyer','master_supplier')
        OR v_role_name IN ('master_buyer','master_supplier'))
       AND COALESCE(OLD.status,'active') = 'active' THEN
      -- After change, still master & active?
      DECLARE
        v_new_role_name text;
        v_still_master boolean;
      BEGIN
        SELECT name INTO v_new_role_name FROM public.roles WHERE id = NEW.role_id;
        v_still_master := (NEW.role IN ('master_buyer','master_supplier')
                           OR v_new_role_name IN ('master_buyer','master_supplier'));
        IF (NOT v_still_master OR COALESCE(NEW.status,'active') <> 'active') THEN
          IF public.is_last_master(OLD.company_id, OLD.user_id) THEN
            RAISE EXCEPTION 'last_master_protected' USING ERRCODE = 'P0010',
              HINT = 'Promote another member to master before changing this one.';
          END IF;
        END IF;
      END;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS company_users_protect_last_master_del ON public.company_users;
CREATE TRIGGER company_users_protect_last_master_del
BEFORE DELETE ON public.company_users
FOR EACH ROW EXECUTE FUNCTION public.tg_company_users_protect_last_master();

DROP TRIGGER IF EXISTS company_users_protect_last_master_upd ON public.company_users;
CREATE TRIGGER company_users_protect_last_master_upd
BEFORE UPDATE OF role, role_id, status ON public.company_users
FOR EACH ROW EXECUTE FUNCTION public.tg_company_users_protect_last_master();