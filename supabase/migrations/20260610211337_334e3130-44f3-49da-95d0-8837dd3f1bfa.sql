
-- =========================================================================
-- MIRROR TABLE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.meat_export_mirror (
  id BIGSERIAL PRIMARY KEY,
  id_datamar TEXT,
  pol_country TEXT,
  pol_name TEXT,
  dest_country TEXT,
  dest_name TEXT,
  ship_date_raw TEXT,
  month_key TEXT,
  shipper_name TEXT,
  shipper_country TEXT,
  shipper_state TEXT,
  shipper_city TEXT,
  shipper_type TEXT,
  consignee_name TEXT,
  consignee_country TEXT,
  consignee_city TEXT,
  consignee_type TEXT,
  hs8 TEXT,
  bl_description TEXT,
  wtmt NUMERIC,
  fob_value_usd NUMERIC,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mirror_month       ON public.meat_export_mirror(month_key);
CREATE INDEX IF NOT EXISTS idx_mirror_dest        ON public.meat_export_mirror(dest_country);
CREATE INDEX IF NOT EXISTS idx_mirror_shipper     ON public.meat_export_mirror(shipper_name);
CREATE INDEX IF NOT EXISTS idx_mirror_consignee   ON public.meat_export_mirror(consignee_name);
CREATE INDEX IF NOT EXISTS idx_mirror_hs8         ON public.meat_export_mirror(hs8);
CREATE INDEX IF NOT EXISTS idx_mirror_types       ON public.meat_export_mirror(shipper_type, consignee_type);

GRANT SELECT ON public.meat_export_mirror TO authenticated;
GRANT ALL    ON public.meat_export_mirror TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.meat_export_mirror_id_seq TO service_role;

ALTER TABLE public.meat_export_mirror ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read mirror" ON public.meat_export_mirror;
CREATE POLICY "Admins read mirror" ON public.meat_export_mirror
  FOR SELECT TO authenticated
  USING (public.is_mundus_admin());

-- =========================================================================
-- SYNC STATE (single row)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.agrostats_sync_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status TEXT NOT NULL DEFAULT 'idle',
  rows_copied BIGINT NOT NULL DEFAULT 0,
  total_rows BIGINT,
  last_offset BIGINT NOT NULL DEFAULT 0,
  last_error TEXT,
  last_synced_month TEXT,
  use_mirror BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.agrostats_sync_state (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.agrostats_sync_state TO authenticated;
GRANT ALL    ON public.agrostats_sync_state TO service_role;

ALTER TABLE public.agrostats_sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read sync state" ON public.agrostats_sync_state;
CREATE POLICY "Admins read sync state" ON public.agrostats_sync_state
  FOR SELECT TO authenticated
  USING (public.is_mundus_admin());

-- =========================================================================
-- HELPER: HS category match
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
    IF cat = 'all' THEN RETURN TRUE; END IF;
    IF cat = 'bovina_fresca'    AND hs8 LIKE '0201%' THEN RETURN TRUE; END IF;
    IF cat = 'bovina_congelada' AND hs8 LIKE '0202%' THEN RETURN TRUE; END IF;
    IF cat = 'suina'            AND hs8 LIKE '0203%' THEN RETURN TRUE; END IF;
    IF cat = 'aves'             AND hs8 LIKE '0207%' THEN RETURN TRUE; END IF;
    IF cat = 'miudezas'         AND hs8 LIKE '0206%' THEN RETURN TRUE; END IF;
    IF cat = 'outros' AND hs8 LIKE '02%'
       AND hs8 NOT LIKE '0201%' AND hs8 NOT LIKE '0202%'
       AND hs8 NOT LIKE '0203%' AND hs8 NOT LIKE '0206%'
       AND hs8 NOT LIKE '0207%' THEN RETURN TRUE; END IF;
  END LOOP;
  RETURN FALSE;
END $$;

-- =========================================================================
-- HELPER: dimension to column (whitelisted)
-- =========================================================================
CREATE OR REPLACE FUNCTION public._mirror_dim_col(dim TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE dim
    WHEN 'shipper'          THEN 'shipper_name'
    WHEN 'consignee'        THEN 'consignee_name'
    WHEN 'destCountry'      THEN 'dest_country'
    WHEN 'destPort'         THEN 'dest_name'
    WHEN 'polPort'          THEN 'pol_name'
    WHEN 'hs8'              THEN 'hs8'
    WHEN 'consigneeCountry' THEN 'consignee_country'
    WHEN 'shipperState'     THEN 'shipper_state'
  END
$$;

-- =========================================================================
-- HELPER: previous YYYY-MM range
-- =========================================================================
CREATE OR REPLACE FUNCTION public._mirror_prev_range(p_from TEXT, p_to TEXT)
RETURNS TABLE(prev_from TEXT, prev_to TEXT)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  a INT; b INT; len INT; pt INT; pf INT;
BEGIN
  IF p_from !~ '^\d{4}-\d{2}$' OR p_to !~ '^\d{4}-\d{2}$' THEN
    RETURN;
  END IF;
  a := split_part(p_from,'-',1)::int * 12 + (split_part(p_from,'-',2)::int - 1);
  b := split_part(p_to,'-',1)::int   * 12 + (split_part(p_to,'-',2)::int   - 1);
  len := b - a + 1;
  pt := a - 1; pf := pt - len + 1;
  IF pf < 0 THEN RETURN; END IF;
  prev_from := lpad((pf/12)::text,4,'0') || '-' || lpad(((pf%12)+1)::text,2,'0');
  prev_to   := lpad((pt/12)::text,4,'0') || '-' || lpad(((pt%12)+1)::text,2,'0');
  RETURN NEXT;
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
      AND (COALESCE((f->>'realOwnerOnly')::boolean, true) = false OR (m.shipper_type = 'REAL DONO' AND m.consignee_type = 'REAL DONO'))
      AND (NOT (f ? 'hsCategory') OR public._hs_category_match(m.hs8, f->'hsCategory'))
  )
  SELECT jsonb_build_object(
    'volume', COALESCE(SUM(wtmt),0)::float8,
    'fob',    COALESCE(SUM(fob_value_usd),0)::float8,
    'avg_price_ton', CASE WHEN SUM(wtmt) > 0 THEN (SUM(fob_value_usd)/SUM(wtmt))::float8 ELSE NULL END,
    'shippers',       COUNT(DISTINCT shipper_name),
    'consignees',     COUNT(DISTINCT consignee_name),
    'dest_countries', COUNT(DISTINCT dest_country)
  ) INTO current_kpi FROM base;

  SELECT prev_from, prev_to INTO pf, pt
    FROM public._mirror_prev_range(f->>'from', f->>'to');
  IF pf IS NOT NULL THEN
    previous_kpi := public.agrostats_kpis(
      jsonb_set(jsonb_set(f, '{from}', to_jsonb(pf)), '{to}', to_jsonb(pt))
    ) -> 'current';
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
      AND (COALESCE((f->>'realOwnerOnly')::boolean, true) = false OR (m.shipper_type = 'REAL DONO' AND m.consignee_type = 'REAL DONO'))
      AND (NOT (f ? 'hsCategory') OR public._hs_category_match(m.hs8, f->'hsCategory'))
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
      AND (COALESCE(($1->>'realOwnerOnly')::boolean, true) = false OR (m.shipper_type = 'REAL DONO' AND m.consignee_type = 'REAL DONO'))
      AND (NOT ($1 ? 'hsCategory') OR public._hs_category_match(m.hs8, $1->'hsCategory'))
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

  RETURN jsonb_build_object(
    'rows', rows_json,
    'total', jsonb_build_object('volume', total_vol, 'fob', total_fob)
  );
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
  IF row_col IS NULL OR col_col IS NULL THEN
    RAISE EXCEPTION 'Invalid dimension';
  END IF;

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
      AND (COALESCE(($1->>'realOwnerOnly')::boolean, true) = false OR (m.shipper_type = 'REAL DONO' AND m.consignee_type = 'REAL DONO'))
      AND (NOT ($1 ? 'hsCategory') OR public._hs_category_match(m.hs8, $1->'hsCategory'))
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

  RETURN jsonb_build_object(
    'rows', to_jsonb(row_keys),
    'cols', to_jsonb(col_keys),
    'cells', COALESCE(cells, '{}'::jsonb)
  );
END $$;

-- =========================================================================
-- SEARCH ENTITY
-- =========================================================================
CREATE OR REPLACE FUNCTION public.agrostats_search_entity(entity TEXT, q TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSONB; col TEXT;
BEGIN
  IF q IS NULL OR length(q) < 2 THEN RETURN jsonb_build_object('rows','[]'::jsonb); END IF;
  col := CASE WHEN entity = 'shipper' THEN 'shipper_name' ELSE 'consignee_name' END;
  EXECUTE format($s$
    SELECT jsonb_build_object('rows', COALESCE(jsonb_agg(jsonb_build_object('name', name)), '[]'::jsonb))
    FROM (SELECT DISTINCT %I AS name FROM public.meat_export_mirror
          WHERE %I ILIKE $1 AND %I IS NOT NULL AND %I <> '' ORDER BY 1 LIMIT 20) t
  $s$, col, col, col, col) INTO result USING '%' || q || '%';
  RETURN result;
END $$;

-- Lock down: revoke from public, grant to service_role only
REVOKE ALL ON FUNCTION public.agrostats_kpis(JSONB)               FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agrostats_monthly(JSONB)            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agrostats_top(JSONB,TEXT,TEXT,INT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agrostats_matrix(JSONB,TEXT,TEXT,TEXT,INT,INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agrostats_search_entity(TEXT,TEXT)  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.agrostats_kpis(JSONB)            TO service_role;
GRANT EXECUTE ON FUNCTION public.agrostats_monthly(JSONB)         TO service_role;
GRANT EXECUTE ON FUNCTION public.agrostats_top(JSONB,TEXT,TEXT,INT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.agrostats_matrix(JSONB,TEXT,TEXT,TEXT,INT,INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.agrostats_search_entity(TEXT,TEXT) TO service_role;
