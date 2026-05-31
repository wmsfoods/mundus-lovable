
ALTER TABLE public.mw_instances
  ADD COLUMN IF NOT EXISTS provider_type text NOT NULL DEFAULT 'self_hosted',
  ADD COLUMN IF NOT EXISTS instance_id_external text;
