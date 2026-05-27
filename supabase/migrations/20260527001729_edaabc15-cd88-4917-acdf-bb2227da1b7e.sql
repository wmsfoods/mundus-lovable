
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  user_id uuid,
  user_email text,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name text,
  actor_role text CHECK (actor_role IN ('supplier','buyer','admin','system')),
  action text NOT NULL,
  category text NOT NULL CHECK (category IN ('offer','request','negotiation','order','company','user','catalog','system','auth')),
  entity_type text,
  entity_id uuid,
  entity_label text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  severity text DEFAULT 'info' CHECK (severity IN ('info','warn','critical'))
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created  ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action   ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_category ON public.audit_log(category);
CREATE INDEX IF NOT EXISTS idx_audit_log_user     ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_company  ON public.audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity   ON public.audit_log(entity_type, entity_id);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_select"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_mundus_admin());

CREATE POLICY "audit_log_company_select"
  ON public.audit_log FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND company_id = public.current_user_company_id());

CREATE POLICY "audit_log_insert_any_auth"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- Append-only: block updates and deletes for non-service roles by simply not creating policies.
