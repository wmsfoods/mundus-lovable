CREATE OR REPLACE FUNCTION public.agrostats_opportunity_match(
  f JSONB,
  exporter TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  where_sql TEXT;
  rows_json JSONB;
BEGIN
  where_sql := $w$
    WHERE (($1->>'from') IS NULL OR m.month_key >= $1->>'from')
      AND (($1->>'to')   IS NULL OR m.month_key <= $1->>'to')
      AND (NOT ($1 ? 'hs8')              OR jsonb_array_length($1->'hs8') = 0              OR m.hs8 = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'hs8'))))
      AND (NOT ($1 ? 'destCountry')      OR jsonb_array_length($1->'destCountry') = 0      OR UPPER(m.dest_country) = ANY (ARRAY(SELECT UPPER(jsonb_array_elements_text($1->'destCountry')))))
      AND (NOT ($1 ? 'polPort')          OR jsonb_array_length($1->'polPort') = 0          OR UPPER(m.pol_name) = ANY (ARRAY(SELECT UPPER(jsonb_array_elements_text($1->'polPort')))))
      AND (NOT ($1 ? 'consigneeCountry') OR jsonb_array_length($1->'consigneeCountry') = 0 OR UPPER(m.consignee_country) = ANY (ARRAY(SELECT UPPER(jsonb_array_elements_text($1->'consigneeCountry')))))
      AND (COALESCE(($1->>'realOwnerOnly')::boolean, true) = false OR (m.shipper_type = 'REAL DONO' AND m.consignee_type = 'REAL DONO'))
      AND (NOT ($1 ? 'hsCategory')  OR public._hs_category_match(m.hs8, $1->'hsCategory'))
      AND (NOT ($1 ? 'temperature') OR public._temperature_match(m.hs8, m.bl_description, $1->'temperature'))
  $w$;

  EXECUTE format($q$
    WITH base AS (
      SELECT
        m.consignee_name AS name,
        m.dest_country,
        m.consignee_country,
        m.shipper_name,
        m.wtmt,
        m.fob_value_usd
      FROM public.meat_export_mirror m
      %s
        AND m.consignee_name IS NOT NULL AND m.consignee_name <> ''
    ),
    agg AS (
      SELECT
        name,
        COALESCE(SUM(wtmt),0)::float8 AS volume,
        COALESCE(SUM(fob_value_usd),0)::float8 AS fob,
        CASE WHEN SUM(wtmt) > 0 THEN (SUM(fob_value_usd)/SUM(wtmt))::float8 ELSE NULL END AS avg_price_ton,
        COUNT(DISTINCT shipper_name)::bigint AS suppliers_count,
        COUNT(*)::bigint AS shipments,
        bool_or($2::text IS NOT NULL AND shipper_name ILIKE '%%' || $2 || '%%') AS buys_from_exporter
      FROM base
      GROUP BY name
    ),
    country_mode AS (
      SELECT name, country FROM (
        SELECT name, COALESCE(dest_country, consignee_country, '') AS country,
               ROW_NUMBER() OVER (PARTITION BY name ORDER BY COUNT(*) DESC) AS rn
        FROM base
        GROUP BY name, COALESCE(dest_country, consignee_country, '')
      ) z WHERE rn = 1
    )
    SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY t.volume DESC), '[]'::jsonb) FROM (
      SELECT a.name, COALESCE(c.country, '') AS country,
             a.volume, a.fob, a.avg_price_ton, a.suppliers_count, a.shipments, a.buys_from_exporter
      FROM agg a LEFT JOIN country_mode c USING (name)
      ORDER BY a.volume DESC
      LIMIT 50
    ) t
  $q$, where_sql)
  INTO rows_json
  USING f, exporter;

  RETURN jsonb_build_object('rows', COALESCE(rows_json, '[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.agrostats_opportunity_match(JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agrostats_opportunity_match(JSONB, TEXT) TO service_role;