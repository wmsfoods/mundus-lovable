CREATE OR REPLACE FUNCTION public.get_mundus_vitrine_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH
  tons AS (
    SELECT COALESCE(SUM(amount), 0) / 1000.0 AS total_tons
    FROM public.offer_items
  ),
  origins AS (
    SELECT COUNT(DISTINCT c) AS n FROM (
      SELECT NULLIF(TRIM(origin_country), '') AS c
      FROM public.offers
      WHERE origin_country IS NOT NULL
      UNION
      SELECT NULLIF(TRIM(unnest(origin_countries)), '') AS c
      FROM public.buyer_requests
      WHERE origin_countries IS NOT NULL
    ) t
    WHERE c IS NOT NULL
  ),
  destinations AS (
    SELECT COUNT(DISTINCT c) AS n FROM (
      SELECT NULLIF(TRIM(co.english_name), '') AS c
      FROM public.markets m
      JOIN public.offer_markets om ON om.market_id = m.id
      JOIN public.countries co ON co.id = m.country_id
      UNION
      SELECT NULLIF(TRIM(destination_country), '') AS c
      FROM public.buyer_requests
      WHERE destination_country IS NOT NULL
    ) t
    WHERE c IS NOT NULL
  )
  SELECT jsonb_build_object(
    'total_tons', (SELECT ROUND(total_tons::numeric, 1) FROM tons),
    'origins', (SELECT n FROM origins),
    'destinations', (SELECT n FROM destinations)
  );
$$;

REVOKE ALL ON FUNCTION public.get_mundus_vitrine_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_mundus_vitrine_stats() TO anon, authenticated, service_role;