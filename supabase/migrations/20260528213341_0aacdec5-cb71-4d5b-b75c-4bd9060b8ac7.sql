CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  to_email text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  template_name text,
  template_vars jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_queue TO authenticated;
GRANT ALL ON public.email_queue TO service_role;

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage email queue"
  ON public.email_queue
  FOR ALL
  TO authenticated
  USING (public.is_mundus_admin())
  WITH CHECK (public.is_mundus_admin());

CREATE POLICY "Authenticated can enqueue emails"
  ON public.email_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status, created_at);