
-- ============ offer_likes ============
CREATE TABLE public.offer_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (offer_id, company_id)
);
CREATE INDEX idx_offer_likes_offer ON public.offer_likes(offer_id);
CREATE INDEX idx_offer_likes_company ON public.offer_likes(company_id);

GRANT SELECT, INSERT, DELETE ON public.offer_likes TO authenticated;
GRANT ALL ON public.offer_likes TO service_role;
ALTER TABLE public.offer_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offer_likes_select_all_auth"
  ON public.offer_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "offer_likes_insert_own_company"
  ON public.offer_likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = (SELECT active_company_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "offer_likes_delete_own_company"
  ON public.offer_likes FOR DELETE TO authenticated
  USING (
    company_id = (SELECT active_company_id FROM public.users WHERE id = auth.uid())
  );

-- ============ offer_favorites ============
CREATE TABLE public.offer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (offer_id, company_id)
);
CREATE INDEX idx_offer_favorites_offer ON public.offer_favorites(offer_id);
CREATE INDEX idx_offer_favorites_company ON public.offer_favorites(company_id);

GRANT SELECT, INSERT, DELETE ON public.offer_favorites TO authenticated;
GRANT ALL ON public.offer_favorites TO service_role;
ALTER TABLE public.offer_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offer_favorites_select_all_auth"
  ON public.offer_favorites FOR SELECT TO authenticated USING (true);

CREATE POLICY "offer_favorites_insert_own_company"
  ON public.offer_favorites FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = (SELECT active_company_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "offer_favorites_delete_own_company"
  ON public.offer_favorites FOR DELETE TO authenticated
  USING (
    company_id = (SELECT active_company_id FROM public.users WHERE id = auth.uid())
  );

-- ============ offer_shares ============
CREATE TABLE public.offer_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  company_id UUID,
  user_id UUID,
  channel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_offer_shares_offer ON public.offer_shares(offer_id);

GRANT SELECT, INSERT ON public.offer_shares TO authenticated;
GRANT SELECT, INSERT ON public.offer_shares TO anon;
GRANT ALL ON public.offer_shares TO service_role;
ALTER TABLE public.offer_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offer_shares_select_all"
  ON public.offer_shares FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "offer_shares_insert_any"
  ON public.offer_shares FOR INSERT TO authenticated, anon WITH CHECK (true);

-- ============ aggregated counts RPC (used by public marketplace) ============
CREATE OR REPLACE FUNCTION public.get_offer_social_counts(p_offer_ids UUID[])
RETURNS TABLE (offer_id UUID, likes BIGINT, favorites BIGINT, shares BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o AS offer_id,
    (SELECT count(*) FROM public.offer_likes ol WHERE ol.offer_id = o) AS likes,
    (SELECT count(*) FROM public.offer_favorites of WHERE of.offer_id = o) AS favorites,
    (SELECT count(*) FROM public.offer_shares os WHERE os.offer_id = o) AS shares
  FROM unnest(p_offer_ids) AS o;
$$;

GRANT EXECUTE ON FUNCTION public.get_offer_social_counts(UUID[]) TO anon, authenticated;
