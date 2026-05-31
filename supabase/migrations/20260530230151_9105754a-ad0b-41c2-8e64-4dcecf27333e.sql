
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  plan text NOT NULL CHECK (plan IN ('supplier_pro','buyer_pro')),
  status text NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active','inactive','past_due','canceled','trialing','incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company ON public.company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_stripe_customer ON public.company_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_stripe_sub ON public.company_subscriptions(stripe_subscription_id);

GRANT SELECT ON public.company_subscriptions TO authenticated;
GRANT ALL ON public.company_subscriptions TO service_role;

ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_members_read_own_subscription" ON public.company_subscriptions;
CREATE POLICY "company_members_read_own_subscription"
  ON public.company_subscriptions FOR SELECT TO authenticated
  USING (
    public.is_mundus_admin()
    OR company_id IN (SELECT public.user_supplier_scope_ids())
    OR company_id IN (SELECT public.user_buyer_scope_ids())
    OR company_id = public.company_family_root(public.current_user_company_id())
  );

DROP TRIGGER IF EXISTS trg_company_subscriptions_updated ON public.company_subscriptions;
CREATE TRIGGER trg_company_subscriptions_updated
  BEFORE UPDATE ON public.company_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Family-aware PRO check: company itself OR its family root
CREATE OR REPLACE FUNCTION public.company_has_pro(p_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_subscriptions cs
    WHERE cs.status = 'active'
      AND (
        cs.company_id = p_company_id
        OR cs.company_id = public.company_family_root(p_company_id)
      )
  );
$$;
GRANT EXECUTE ON FUNCTION public.company_has_pro(uuid) TO authenticated;

-- Admin override (support only)
CREATE OR REPLACE FUNCTION public.admin_set_subscription_status(p_subscription_id uuid, p_status text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_mundus_admin() THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501';
  END IF;
  IF p_status NOT IN ('active','inactive','past_due','canceled','trialing','incomplete') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE='22023';
  END IF;
  UPDATE public.company_subscriptions
     SET status = p_status,
         canceled_at = CASE WHEN p_status='canceled' THEN now() ELSE canceled_at END
   WHERE id = p_subscription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'subscription_not_found' USING ERRCODE='P0001'; END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription_status(uuid, text) TO authenticated;
