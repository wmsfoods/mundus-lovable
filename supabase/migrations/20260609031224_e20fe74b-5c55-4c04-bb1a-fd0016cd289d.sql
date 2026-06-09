
ALTER TABLE public.buyer_requests
  ADD COLUMN IF NOT EXISTS target_supplier_ids uuid[] NULL;

CREATE INDEX IF NOT EXISTS buyer_requests_target_supplier_ids_idx
  ON public.buyer_requests USING gin (target_supplier_ids);

DROP POLICY IF EXISTS buyer_requests_select_scoped ON public.buyer_requests;

CREATE POLICY buyer_requests_select_scoped
ON public.buyer_requests
FOR SELECT
USING (
  is_mundus_admin()
  OR (buyer_company_id IN (SELECT user_buyer_scope_ids()))
  -- Public requests: no single target AND no array targets
  OR (
    target_supplier_id IS NULL
    AND (target_supplier_ids IS NULL OR cardinality(target_supplier_ids) = 0)
    AND COALESCE(status, '') <> ALL (ARRAY['draft','cancelled','archived'])
  )
  -- Single-target (legacy) — non-family-HQ branch
  OR (
    target_supplier_id IS NOT NULL
    AND NOT is_family_hq(target_supplier_id)
    AND target_supplier_id IN (SELECT user_supplier_scope_ids())
  )
  -- Single-target — family HQ branch
  OR (
    target_supplier_id IS NOT NULL
    AND is_family_hq(target_supplier_id)
    AND (is_family_global_director(target_supplier_id) OR is_family_hq_member(target_supplier_id))
  )
  -- Multi-target: any supplier in caller's supplier scope appears in the array
  OR (
    target_supplier_ids IS NOT NULL
    AND cardinality(target_supplier_ids) > 0
    AND EXISTS (
      SELECT 1
      FROM unnest(target_supplier_ids) AS t(id)
      WHERE t.id IN (SELECT user_supplier_scope_ids())
         OR (is_family_hq(t.id)
             AND (is_family_global_director(t.id) OR is_family_hq_member(t.id)))
    )
  )
  -- Assigned office branch (unchanged)
  OR (
    assigned_office_id IS NOT NULL
    AND assigned_office_id IN (SELECT user_supplier_scope_ids())
  )
);
