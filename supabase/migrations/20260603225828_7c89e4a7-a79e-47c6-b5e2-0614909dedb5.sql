-- ============================================
-- MUNDUS AUTO ENGINE V2 — FASE 1: FOUNDATION
-- (role lives in public.company_users, not public.users)
-- ============================================

-- 1) companies flags
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS managed_by_mundus boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mundus_managed_since timestamptz;

COMMENT ON COLUMN public.companies.managed_by_mundus IS
  'When true, Mundus users with role admin/operations can act on behalf of this company.';

-- 2) cut_rounds.item_status
ALTER TABLE public.cut_rounds
  ADD COLUMN IF NOT EXISTS item_status text NOT NULL DEFAULT 'still_negotiating';

ALTER TABLE public.cut_rounds DROP CONSTRAINT IF EXISTS cut_rounds_item_status_check;
ALTER TABLE public.cut_rounds
  ADD CONSTRAINT cut_rounds_item_status_check
  CHECK (item_status IN ('still_negotiating','agreed','held'));

COMMENT ON COLUMN public.cut_rounds.item_status IS
  'Per-item negotiation status in mixed containers.';

-- 3) counter_proposals delivery fields
ALTER TABLE public.counter_proposals
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS scheduled_send_at timestamptz;

ALTER TABLE public.counter_proposals DROP CONSTRAINT IF EXISTS counter_proposals_delivery_status_check;
ALTER TABLE public.counter_proposals
  ADD CONSTRAINT counter_proposals_delivery_status_check
  CHECK (delivery_status IN ('preparing','sent'));

COMMENT ON COLUMN public.counter_proposals.delivery_status IS
  'preparing = engine still computing/waiting random delay. sent = visible to buyer.';
COMMENT ON COLUMN public.counter_proposals.scheduled_send_at IS
  'When the engine intends to flip delivery_status to sent. NULL for manual.';

-- 4) motor_jobs
CREATE TABLE IF NOT EXISTS public.motor_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  round_proposal_id uuid REFERENCES public.round_proposals(id) ON DELETE CASCADE,
  fire_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT motor_jobs_status_check CHECK (status IN ('pending','processing','done','failed','cancelled'))
);

GRANT ALL ON public.motor_jobs TO service_role;

ALTER TABLE public.motor_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS motor_jobs_service_only ON public.motor_jobs;
CREATE POLICY motor_jobs_service_only ON public.motor_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS motor_jobs_fire_at_idx
  ON public.motor_jobs (fire_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS motor_jobs_negotiation_idx
  ON public.motor_jobs (negotiation_id);

COMMENT ON TABLE public.motor_jobs IS
  'Queue for delayed engine counter-proposals (30s-2min). Picked up by pg_cron in phase 3.';

-- 5) negotiation_audit
CREATE TABLE IF NOT EXISTS public.negotiation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text,
  on_behalf_of_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.negotiation_audit TO authenticated;
GRANT ALL ON public.negotiation_audit TO service_role;

ALTER TABLE public.negotiation_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS negotiation_audit_read ON public.negotiation_audit;
CREATE POLICY negotiation_audit_read ON public.negotiation_audit
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.negotiations n
      JOIN public.offers o ON o.id = n.offer_id
      WHERE n.id = negotiation_audit.negotiation_id
        AND (
          n.buyer_company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
          OR o.supplier_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.company_users cu
            JOIN public.companies c ON c.id = cu.company_id
            WHERE cu.user_id = auth.uid()
              AND c.name ILIKE '%mundus%'
              AND cu.role IN ('admin','operations')
          )
        )
    )
  );

DROP POLICY IF EXISTS negotiation_audit_insert ON public.negotiation_audit;
CREATE POLICY negotiation_audit_insert ON public.negotiation_audit
  FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX IF NOT EXISTS negotiation_audit_negotiation_idx
  ON public.negotiation_audit (negotiation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS negotiation_audit_actor_idx
  ON public.negotiation_audit (actor_user_id, created_at DESC);

COMMENT ON TABLE public.negotiation_audit IS
  'Audit trail of every negotiation action including Mundus on-behalf-of actions.';

-- 6) can_act_on_company
CREATE OR REPLACE FUNCTION public.can_act_on_company(target_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;

  -- Direct membership in target company
  IF EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = v_user_id AND company_id = target_company_id
  ) THEN
    RETURN true;
  END IF;

  -- Mundus delegation: user is admin/operations of a Mundus company
  -- AND target company is managed_by_mundus
  IF EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.companies c ON c.id = cu.company_id
    WHERE cu.user_id = v_user_id
      AND cu.role IN ('admin','operations')
      AND c.name ILIKE '%mundus%'
  ) AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = target_company_id AND c.managed_by_mundus = true
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_act_on_company IS
  'True if current user can act on target_company_id (direct member, or Mundus admin/ops when target.managed_by_mundus = true).';

GRANT EXECUTE ON FUNCTION public.can_act_on_company TO authenticated;

-- 7) Realtime
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.motor_jobs;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_audit;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;