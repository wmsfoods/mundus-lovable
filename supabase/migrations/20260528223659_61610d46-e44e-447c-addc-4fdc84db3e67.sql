ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_offer_views(offer_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.offers SET view_count = COALESCE(view_count, 0) + 1 WHERE id = offer_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_offer_views(uuid) TO authenticated, anon;
