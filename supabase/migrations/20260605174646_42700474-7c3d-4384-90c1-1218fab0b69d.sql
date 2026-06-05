CREATE TABLE public.admin_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES public.users(id),
  action_type text NOT NULL CHECK (action_type IN ('soft_delete','hard_delete','restore','reset_playground')),
  entity_type text NOT NULL,
  entity_id uuid,
  entity_label text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_action_log_created_desc ON public.admin_action_log (created_at DESC);
CREATE INDEX idx_admin_action_log_actor ON public.admin_action_log (actor_user_id);

GRANT SELECT, INSERT ON public.admin_action_log TO authenticated;
GRANT ALL ON public.admin_action_log TO service_role;

ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mundus_admin_select" ON public.admin_action_log
  FOR SELECT TO authenticated
  USING (public.is_mundus_admin());

CREATE POLICY "mundus_admin_insert" ON public.admin_action_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_mundus_admin() AND actor_user_id = auth.uid());