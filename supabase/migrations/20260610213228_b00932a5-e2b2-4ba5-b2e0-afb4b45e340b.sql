
-- =========================================================================
-- HELPER: HS category match (NEW TAXONOMY, with legacy alias mapping)
-- =========================================================================
CREATE OR REPLACE FUNCTION public._hs_category_match(hs8 TEXT, cats JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cat TEXT;
BEGIN
  IF cats IS NULL OR jsonb_typeof(cats) <> 'array' OR jsonb_array_length(cats) = 0 THEN
    RETURN TRUE;
  END IF;
  FOR cat IN SELECT jsonb_array_elements_text(cats) LOOP
    -- legacy → new alias
    IF cat IN ('bovina_fresca','bovina_congelada') THEN cat := 'beef'; END IF;
    IF cat = 'suina'    THEN cat := 'pork'; END IF;
    IF cat = 'aves'     THEN cat := 'poultry'; END IF;
    IF cat = 'miudezas' THEN cat := 'beef_offals'; END IF;
    IF cat = 'outros'   THEN cat := 'other_meats'; END IF;

    IF cat = 'all' THEN RETURN TRUE; END IF;
    IF cat = 'beef'         AND (hs8 LIKE '0201%' OR hs8 LIKE '0202%') THEN RETURN TRUE; END IF;
    IF cat = 'beef_offals'  AND (hs8 LIKE '02061%' OR hs8 LIKE '02062%') THEN RETURN TRUE; END IF;
    IF cat = 'pork'         AND (hs8 LIKE '0203%' OR hs8 LIKE '02063%' OR hs8 LIKE '02064%') THEN RETURN TRUE; END IF;
    IF cat = 'poultry'      AND hs8 LIKE '0207%' THEN RETURN TRUE; END IF;
    IF cat = 'cured_meats'  AND hs8 LIKE '0210%' THEN RETURN TRUE; END IF;
    IF cat = 'animal_fats'  AND hs8 LIKE '0209%' THEN RETURN TRUE; END IF;
    IF cat = 'other_meats'  AND NOT (
         hs8 LIKE '0201%' OR hs8 LIKE '0202%'
      OR hs8 LIKE '02061%' OR hs8 LIKE '02062%'
      OR hs8 LIKE '0203%' OR hs8 LIKE '02063%' OR hs8 LIKE '02064%'
      OR hs8 LIKE '0207%' OR hs8 LIKE '0210%' OR hs8 LIKE '0209%'
    ) THEN RETURN TRUE; END IF;
  END LOOP;
  RETURN FALSE;
END $$;

-- =========================================================================
-- HELPER: temperature match (frozen / chilled)
-- =========================================================================
CREATE OR REPLACE FUNCTION public._temperature_match(hs8 TEXT, bl TEXT, temps JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  want_frozen BOOLEAN := FALSE;
  want_chilled BOOLEAN := FALSE;
  hsu TEXT := COALESCE(UPPER(hs8), '');
  blu TEXT := COALESCE(UPPER(bl), '');
  is_frozen BOOLEAN;
  is_chilled BOOLEAN;
  has_frozen_tag BOOLEAN;
  has_chilled_tag BOOLEAN;
BEGIN
  IF temps IS NULL OR jsonb_typeof(temps) <> 'array' OR jsonb_array_length(temps) = 0 THEN
    RETURN TRUE;
  END IF;
  want_frozen := temps @> '"frozen"'::jsonb;
  want_chilled := temps @> '"chilled"'::jsonb;
  IF NOT want_frozen AND NOT want_chilled THEN RETURN TRUE; END IF;

  has_frozen_tag  := position('CONGELAD' in hsu) > 0;
  has_chilled_tag := position('FRESCAS OU REFRIGERADAS' in hsu) > 0
                  OR position('FRESCOS OU REFRIGERADOS' in hsu) > 0
                  OR position('FRESCA OU REFRIGERADA' in hsu) > 0;

  IF has_frozen_tag AND NOT has_chilled_tag THEN
    is_frozen := TRUE; is_chilled := FALSE;
  ELSIF has_chilled_tag AND NOT has_frozen_tag THEN
    is_frozen := FALSE; is_chilled := TRUE;
  ELSE
    -- ambiguous or neither → fall back to BL description
    is_frozen  := position('FROZEN' in blu) > 0 OR position('CONGELAD' in blu) > 0;
    is_chilled := position('CHILLED' in blu) > 0 OR position('FRESH' in blu) > 0
               OR position('RESFRIAD' in blu) > 0 OR position('REFRIGERAD' in blu) > 0;
  END IF;

  IF want_frozen  AND is_frozen  THEN RETURN TRUE; END IF;
  IF want_chilled AND is_chilled THEN RETURN TRUE; END IF;
  RETURN FALSE;
END $$;

-- =========================================================================
-- KPIs (returns { current, previous })
-- =========================================================================
CREATE OR REPLACE FUNCTION public.agrostats_kpis(f JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_kpi JSONB;
  previous_kpi JSONB;
  pf TEXT; pt TEXT;
BEGIN
  WITH base AS (
    SELECT * FROM public.meat_export_mirror m
    WHERE (f->>'from' IS NULL OR m.month_key >= f->>'from')
      AND (f->>'to'   IS NULL OR m.month_key <= f->>'to')
      AND (NOT (f ? 'hs8')              OR jsonb_array_length(f->'hs8') = 0              OR m.hs8 = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'hs8'))))
      AND (NOT (f ? 'destCountry')      OR jsonb_array_length(f->'destCountry') = 0      OR m.dest_country = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'destCountry'))))
      AND (NOT (f ? 'polPort')          OR jsonb_array_length(f->'polPort') = 0          OR m.pol_name = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'polPort'))))
      AND (NOT (f ? 'consigneeCountry') OR jsonb_array_length(f->'consigneeCountry') = 0 OR m.consignee_country = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'consigneeCountry'))))
      AND (NOT (f ? 'shipperState')     OR jsonb_array_length(f->'shipperState') = 0     OR m.shipper_state = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'shipperState'))))
      AND (f->>'shipperName'   IS NULL OR m.shipper_name   ILIKE '%' || (f->>'shipperName')   || '%')
      AND (f->>'consigneeName' IS NULL OR m.consignee_name ILIKE '%' || (f->>'consigneeName') || '%')
      AND (NOT (f ? 'shipperNames')   OR jsonb_array_length(f->'shipperNames') = 0   OR m.shipper_name   = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'shipperNames'))))
      AND (NOT (f ? 'consigneeNames') OR jsonb_array_length(f->'consigneeNames') = 0 OR m.consignee_name = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'consigneeNames'))))
      AND (f->>'productSearch' IS NULL OR m.hs8 ILIKE '%' || (f->>'productSearch') || '%' OR m.bl_description ILIKE '%' || (f->>'productSearch') || '%')
      AND (NOT (f ? 'productTypes') OR jsonb_array_length(f->'productTypes') = 0 OR m.bl_description = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'productTypes'))))
      AND (COALESCE((f->>'realOwnerOnly')::boolean, true) = false OR (m.shipper_type = 'REAL DONO' AND m.consignee_type = 'REAL DONO'))
      AND (NOT (f ? 'hsCategory')  OR public._hs_category_match(m.hs8, f->'hsCategory'))
      AND (NOT (f ? 'temperature') OR public._temperature_match(m.hs8, m.bl_description, f->'temperature'))
  )
  SELECT jsonb_build_object(
    'volume', COALESCE(SUM(wtmt),0)::float8,
    'fob',    COALESCE(SUM(fob_value_usd),0)::float8,
    'avg_price_ton', CASE WHEN SUM(wtmt) > 0 THEN (SUM(fob_value_usd)/SUM(wtmt))::float8 ELSE NULL END,
    'shippers',       COUNT(DISTINCT shipper_name),
    'consignees',     COUNT(DISTINCT consignee_name),
    'dest_countries', COUNT(DISTINCT dest_country)
  ) INTO current_kpi FROM base;

  SELECT prev_from, prev_to INTO pf, pt FROM public._mirror_prev_range(f->>'from', f->>'to');
  IF pf IS NOT NULL THEN
    previous_kpi := public.agrostats_kpis(jsonb_set(jsonb_set(f, '{from}', to_jsonb(pf)), '{to}', to_jsonb(pt))) -> 'current';
  END IF;
  RETURN jsonb_build_object('current', current_kpi, 'previous', previous_kpi);
END $$;

-- =========================================================================
-- Monthly series
-- =========================================================================
CREATE OR REPLACE FUNCTION public.agrostats_monthly(f JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  SELECT jsonb_build_object('rows', COALESCE(jsonb_agg(row_to_jsonb(t) ORDER BY t.month), '[]'::jsonb))
  INTO result FROM (
    SELECT
      m.month_key AS month,
      COALESCE(SUM(m.wtmt),0)::float8 AS volume,
      COALESCE(SUM(m.fob_value_usd),0)::float8 AS fob,
      CASE WHEN SUM(m.wtmt) > 0 THEN (SUM(m.fob_value_usd)/SUM(m.wtmt))::float8 ELSE NULL END AS avg_price_ton,
      COUNT(*)::bigint AS shipments
    FROM public.meat_export_mirror m
    WHERE (f->>'from' IS NULL OR m.month_key >= f->>'from')
      AND (f->>'to'   IS NULL OR m.month_key <= f->>'to')
      AND (NOT (f ? 'hs8')              OR jsonb_array_length(f->'hs8') = 0              OR m.hs8 = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'hs8'))))
      AND (NOT (f ? 'destCountry')      OR jsonb_array_length(f->'destCountry') = 0      OR m.dest_country = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'destCountry'))))
      AND (NOT (f ? 'polPort')          OR jsonb_array_length(f->'polPort') = 0          OR m.pol_name = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'polPort'))))
      AND (NOT (f ? 'consigneeCountry') OR jsonb_array_length(f->'consigneeCountry') = 0 OR m.consignee_country = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'consigneeCountry'))))
      AND (NOT (f ? 'shipperState')     OR jsonb_array_length(f->'shipperState') = 0     OR m.shipper_state = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'shipperState'))))
      AND (f->>'shipperName'   IS NULL OR m.shipper_name   ILIKE '%' || (f->>'shipperName')   || '%')
      AND (f->>'consigneeName' IS NULL OR m.consignee_name ILIKE '%' || (f->>'consigneeName') || '%')
      AND (NOT (f ? 'shipperNames')   OR jsonb_array_length(f->'shipperNames') = 0   OR m.shipper_name   = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'shipperNames'))))
      AND (NOT (f ? 'consigneeNames') OR jsonb_array_length(f->'consigneeNames') = 0 OR m.consignee_name = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'consigneeNames'))))
      AND (f->>'productSearch' IS NULL OR m.hs8 ILIKE '%' || (f->>'productSearch') || '%' OR m.bl_description ILIKE '%' || (f->>'productSearch') || '%')
      AND (NOT (f ? 'productTypes') OR jsonb_array_length(f->'productTypes') = 0 OR m.bl_description = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'productTypes'))))
      AND (COALESCE((f->>'realOwnerOnly')::boolean, true) = false OR (m.shipper_type = 'REAL DONO' AND m.consignee_type = 'REAL DONO'))
      AND (NOT (f ? 'hsCategory')  OR public._hs_category_match(m.hs8, f->'hsCategory'))
      AND (NOT (f ? 'temperature') OR public._temperature_match(m.hs8, m.bl_description, f->'temperature'))
    GROUP BY m.month_key
  ) t;
  RETURN result;
END $$;

-- =========================================================================
-- TOP (dynamic dimension)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.agrostats_top(
  f JSONB,
  dim TEXT,
  metric TEXT DEFAULT 'volume',
  lim INT DEFAULT 15,
  scope_shipper TEXT DEFAULT NULL,
  scope_consignee TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dim_col TEXT := public._mirror_dim_col(dim);
  cp_col TEXT;
  sort_col TEXT := CASE WHEN metric = 'fob' THEN 'fob' ELSE 'volume' END;
  l INT := GREATEST(1, LEAST(50, COALESCE(lim,15)));
  sql TEXT;
  total_vol FLOAT8;
  total_fob FLOAT8;
  rows_json JSONB;
  where_sql TEXT;
BEGIN
  IF dim_col IS NULL THEN RAISE EXCEPTION 'Invalid dimension: %', dim; END IF;
  cp_col := CASE dim
    WHEN 'shipper'     THEN 'consignee_name'
    WHEN 'consignee'   THEN 'shipper_name'
    WHEN 'destCountry' THEN 'shipper_name'
    WHEN 'destPort'    THEN 'shipper_name'
    WHEN 'hs8'         THEN 'shipper_name'
    ELSE 'shipper_name'
  END;

  where_sql := $w$
    WHERE (($1->>'from') IS NULL OR m.month_key >= $1->>'from')
      AND (($1->>'to')   IS NULL OR m.month_key <= $1->>'to')
      AND (NOT ($1 ? 'hs8')              OR jsonb_array_length($1->'hs8') = 0              OR m.hs8 = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'hs8'))))
      AND (NOT ($1 ? 'destCountry')      OR jsonb_array_length($1->'destCountry') = 0      OR m.dest_country = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'destCountry'))))
      AND (NOT ($1 ? 'polPort')          OR jsonb_array_length($1->'polPort') = 0          OR m.pol_name = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'polPort'))))
      AND (NOT ($1 ? 'consigneeCountry') OR jsonb_array_length($1->'consigneeCountry') = 0 OR m.consignee_country = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'consigneeCountry'))))
      AND (NOT ($1 ? 'shipperState')     OR jsonb_array_length($1->'shipperState') = 0     OR m.shipper_state = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'shipperState'))))
      AND (($1->>'shipperName')   IS NULL OR m.shipper_name   ILIKE '%' || ($1->>'shipperName')   || '%')
      AND (($1->>'consigneeName') IS NULL OR m.consignee_name ILIKE '%' || ($1->>'consigneeName') || '%')
      AND (NOT ($1 ? 'shipperNames')   OR jsonb_array_length($1->'shipperNames') = 0   OR m.shipper_name   = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'shipperNames'))))
      AND (NOT ($1 ? 'consigneeNames') OR jsonb_array_length($1->'consigneeNames') = 0 OR m.consignee_name = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'consigneeNames'))))
      AND (($1->>'productSearch') IS NULL OR m.hs8 ILIKE '%' || ($1->>'productSearch') || '%' OR m.bl_description ILIKE '%' || ($1->>'productSearch') || '%')
      AND (NOT ($1 ? 'productTypes') OR jsonb_array_length($1->'productTypes') = 0 OR m.bl_description = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'productTypes'))))
      AND (COALESCE(($1->>'realOwnerOnly')::boolean, true) = false OR (m.shipper_type = 'REAL DONO' AND m.consignee_type = 'REAL DONO'))
      AND (NOT ($1 ? 'hsCategory')  OR public._hs_category_match(m.hs8, $1->'hsCategory'))
      AND (NOT ($1 ? 'temperature') OR public._temperature_match(m.hs8, m.bl_description, $1->'temperature'))
      AND ($2::text IS NULL OR m.shipper_name = $2)
      AND ($3::text IS NULL OR m.consignee_name = $3)
  $w$;

  EXECUTE 'SELECT COALESCE(SUM(m.wtmt),0)::float8, COALESCE(SUM(m.fob_value_usd),0)::float8 FROM public.meat_export_mirror m ' || where_sql
    INTO total_vol, total_fob
    USING f, scope_shipper, scope_consignee;

  sql := format($q$
    SELECT COALESCE(jsonb_agg(to_jsonb(t.*) ORDER BY t.%I DESC), '[]'::jsonb) FROM (
      SELECT m.%I AS name,
        COALESCE(SUM(m.wtmt),0)::float8 AS volume,
        COALESCE(SUM(m.fob_value_usd),0)::float8 AS fob,
        CASE WHEN SUM(m.wtmt) > 0 THEN (SUM(m.fob_value_usd)/SUM(m.wtmt))::float8 ELSE NULL END AS avg_price_ton,
        COUNT(DISTINCT m.%I)::bigint AS counterparts,
        COUNT(*)::bigint AS shipments,
        CASE WHEN %L = 'fob'
             THEN CASE WHEN $4 > 0 THEN (COALESCE(SUM(m.fob_value_usd),0)/$4)*100 ELSE 0 END
             ELSE CASE WHEN $5 > 0 THEN (COALESCE(SUM(m.wtmt),0)/$5)*100 ELSE 0 END
        END AS share_pct
      FROM public.meat_export_mirror m %s
        AND m.%I IS NOT NULL AND m.%I <> ''
      GROUP BY m.%I
      ORDER BY %I DESC
      LIMIT %s
    ) t
  $q$, sort_col, dim_col, cp_col, metric, where_sql, dim_col, dim_col, dim_col, sort_col, l);

  EXECUTE sql INTO rows_json USING f, scope_shipper, scope_consignee, total_fob, total_vol;
  RETURN jsonb_build_object('rows', rows_json, 'total', jsonb_build_object('volume', total_vol, 'fob', total_fob));
END $$;

-- =========================================================================
-- MATRIX
-- =========================================================================
CREATE OR REPLACE FUNCTION public.agrostats_matrix(
  f JSONB,
  row_dim TEXT,
  col_dim TEXT,
  metric TEXT DEFAULT 'volume',
  limit_rows INT DEFAULT 15,
  limit_cols INT DEFAULT 8
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_col TEXT := public._mirror_dim_col(row_dim);
  col_col TEXT := public._mirror_dim_col(col_dim);
  metric_expr TEXT := CASE WHEN metric = 'fob' THEN 'SUM(m.fob_value_usd)' ELSE 'SUM(m.wtmt)' END;
  lr INT := GREATEST(1, LEAST(15, COALESCE(limit_rows,15)));
  lc INT := GREATEST(1, LEAST(8,  COALESCE(limit_cols,8)));
  where_sql TEXT;
  row_keys TEXT[];
  col_keys TEXT[];
  cells JSONB;
BEGIN
  IF row_col IS NULL OR col_col IS NULL THEN RAISE EXCEPTION 'Invalid dimension'; END IF;

  where_sql := $w$
    WHERE (($1->>'from') IS NULL OR m.month_key >= $1->>'from')
      AND (($1->>'to')   IS NULL OR m.month_key <= $1->>'to')
      AND (NOT ($1 ? 'hs8')              OR jsonb_array_length($1->'hs8') = 0              OR m.hs8 = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'hs8'))))
      AND (NOT ($1 ? 'destCountry')      OR jsonb_array_length($1->'destCountry') = 0      OR m.dest_country = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'destCountry'))))
      AND (NOT ($1 ? 'polPort')          OR jsonb_array_length($1->'polPort') = 0          OR m.pol_name = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'polPort'))))
      AND (NOT ($1 ? 'consigneeCountry') OR jsonb_array_length($1->'consigneeCountry') = 0 OR m.consignee_country = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'consigneeCountry'))))
      AND (NOT ($1 ? 'shipperState')     OR jsonb_array_length($1->'shipperState') = 0     OR m.shipper_state = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'shipperState'))))
      AND (($1->>'shipperName')   IS NULL OR m.shipper_name   ILIKE '%' || ($1->>'shipperName')   || '%')
      AND (($1->>'consigneeName') IS NULL OR m.consignee_name ILIKE '%' || ($1->>'consigneeName') || '%')
      AND (NOT ($1 ? 'shipperNames')   OR jsonb_array_length($1->'shipperNames') = 0   OR m.shipper_name   = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'shipperNames'))))
      AND (NOT ($1 ? 'consigneeNames') OR jsonb_array_length($1->'consigneeNames') = 0 OR m.consignee_name = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'consigneeNames'))))
      AND (($1->>'productSearch') IS NULL OR m.hs8 ILIKE '%' || ($1->>'productSearch') || '%' OR m.bl_description ILIKE '%' || ($1->>'productSearch') || '%')
      AND (NOT ($1 ? 'productTypes') OR jsonb_array_length($1->'productTypes') = 0 OR m.bl_description = ANY (ARRAY(SELECT jsonb_array_elements_text($1->'productTypes'))))
      AND (COALESCE(($1->>'realOwnerOnly')::boolean, true) = false OR (m.shipper_type = 'REAL DONO' AND m.consignee_type = 'REAL DONO'))
      AND (NOT ($1 ? 'hsCategory')  OR public._hs_category_match(m.hs8, $1->'hsCategory'))
      AND (NOT ($1 ? 'temperature') OR public._temperature_match(m.hs8, m.bl_description, $1->'temperature'))
  $w$;

  EXECUTE format(
    'SELECT ARRAY(SELECT k FROM (SELECT m.%I AS k, %s::float8 AS mt FROM public.meat_export_mirror m %s AND m.%I IS NOT NULL AND m.%I <> '''' GROUP BY 1 ORDER BY 2 DESC LIMIT %s) s)',
    row_col, metric_expr, where_sql, row_col, row_col, lr
  ) INTO row_keys USING f;

  EXECUTE format(
    'SELECT ARRAY(SELECT k FROM (SELECT m.%I AS k, %s::float8 AS mt FROM public.meat_export_mirror m %s AND m.%I IS NOT NULL AND m.%I <> '''' GROUP BY 1 ORDER BY 2 DESC LIMIT %s) s)',
    col_col, metric_expr, where_sql, col_col, col_col, lc
  ) INTO col_keys USING f;

  IF row_keys IS NULL OR array_length(row_keys,1) IS NULL OR col_keys IS NULL OR array_length(col_keys,1) IS NULL THEN
    RETURN jsonb_build_object('rows', '[]'::jsonb, 'cols', '[]'::jsonb, 'cells', '{}'::jsonb);
  END IF;

  EXECUTE format($s$
    SELECT COALESCE(jsonb_object_agg(r, cols_obj), '{}'::jsonb)
    FROM (
      SELECT r, jsonb_object_agg(c, mt) AS cols_obj FROM (
        SELECT m.%I::text AS r, m.%I::text AS c, COALESCE(%s,0)::float8 AS mt
        FROM public.meat_export_mirror m %s
          AND m.%I = ANY($2) AND m.%I = ANY($3)
        GROUP BY 1, 2
      ) x GROUP BY r
    ) y
  $s$, row_col, col_col, metric_expr, where_sql, row_col, col_col)
  INTO cells USING f, row_keys, col_keys;

  RETURN jsonb_build_object('rows', to_jsonb(row_keys), 'cols', to_jsonb(col_keys), 'cells', COALESCE(cells, '{}'::jsonb));
END $$;

-- =========================================================================
-- DISTINCT PRODUCTS (top BL descriptions for the current filter set)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.agrostats_distinct_products(f JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  -- Strip productTypes from the filter so the list itself isn't filtered by the current selection
  SELECT jsonb_build_object('rows', COALESCE(jsonb_agg(jsonb_build_object('name', t.name, 'volume', t.volume) ORDER BY t.volume DESC), '[]'::jsonb))
  INTO result FROM (
    SELECT m.bl_description AS name, COALESCE(SUM(m.wtmt),0)::float8 AS volume
    FROM public.meat_export_mirror m
    WHERE (f->>'from' IS NULL OR m.month_key >= f->>'from')
      AND (f->>'to'   IS NULL OR m.month_key <= f->>'to')
      AND (NOT (f ? 'hs8')              OR jsonb_array_length(f->'hs8') = 0              OR m.hs8 = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'hs8'))))
      AND (NOT (f ? 'destCountry')      OR jsonb_array_length(f->'destCountry') = 0      OR m.dest_country = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'destCountry'))))
      AND (NOT (f ? 'polPort')          OR jsonb_array_length(f->'polPort') = 0          OR m.pol_name = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'polPort'))))
      AND (NOT (f ? 'consigneeCountry') OR jsonb_array_length(f->'consigneeCountry') = 0 OR m.consignee_country = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'consigneeCountry'))))
      AND (NOT (f ? 'shipperState')     OR jsonb_array_length(f->'shipperState') = 0     OR m.shipper_state = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'shipperState'))))
      AND (f->>'shipperName'   IS NULL OR m.shipper_name   ILIKE '%' || (f->>'shipperName')   || '%')
      AND (f->>'consigneeName' IS NULL OR m.consignee_name ILIKE '%' || (f->>'consigneeName') || '%')
      AND (NOT (f ? 'shipperNames')   OR jsonb_array_length(f->'shipperNames') = 0   OR m.shipper_name   = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'shipperNames'))))
      AND (NOT (f ? 'consigneeNames') OR jsonb_array_length(f->'consigneeNames') = 0 OR m.consignee_name = ANY (ARRAY(SELECT jsonb_array_elements_text(f->'consigneeNames'))))
      AND (f->>'productSearch' IS NULL OR m.hs8 ILIKE '%' || (f->>'productSearch') || '%' OR m.bl_description ILIKE '%' || (f->>'productSearch') || '%')
      AND (COALESCE((f->>'realOwnerOnly')::boolean, true) = false OR (m.shipper_type = 'REAL DONO' AND m.consignee_type = 'REAL DONO'))
      AND (NOT (f ? 'hsCategory')  OR public._hs_category_match(m.hs8, f->'hsCategory'))
      AND (NOT (f ? 'temperature') OR public._temperature_match(m.hs8, m.bl_description, f->'temperature'))
      AND m.bl_description IS NOT NULL AND m.bl_description <> ''
    GROUP BY m.bl_description
    ORDER BY volume DESC
    LIMIT 100
  ) t;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.agrostats_distinct_products(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agrostats_distinct_products(JSONB) TO service_role;
