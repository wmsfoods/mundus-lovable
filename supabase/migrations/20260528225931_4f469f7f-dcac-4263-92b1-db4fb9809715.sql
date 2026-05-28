
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS opened_at timestamptz;
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS clicked_at timestamptz;
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS open_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS bounced_at timestamptz;
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS bounce_reason text;

CREATE OR REPLACE FUNCTION public.track_email_open(email_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.email_queue
     SET opened_at = COALESCE(opened_at, now()),
         open_count = COALESCE(open_count, 0) + 1
   WHERE id = email_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_email_click(email_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.email_queue
     SET clicked_at = COALESCE(clicked_at, now()),
         click_count = COALESCE(click_count, 0) + 1,
         opened_at = COALESCE(opened_at, now())
   WHERE id = email_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_email_open(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_email_click(uuid) TO anon, authenticated, service_role;
