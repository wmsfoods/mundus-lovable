ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS resend_id text;
CREATE INDEX IF NOT EXISTS idx_email_queue_resend_id ON public.email_queue (resend_id) WHERE resend_id IS NOT NULL;