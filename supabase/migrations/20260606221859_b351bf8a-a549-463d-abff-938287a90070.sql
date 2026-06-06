CREATE OR REPLACE FUNCTION public.get_public_offers()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  WITH sold AS (
    SELECT offer_id, COALESCE(SUM(fcl_count),0) AS sold_fcl
      FROM negotiations
     WHERE status='bid_accepted' AND deleted_at IS NULL
     GROUP BY offer_id
  ),
  base AS (
    SELECT
      o.id,
      o.offer_number,
      o.origin_country,
      o.origin_port,
      o.shipment_month,
      o.shipment_year,
      o.shipment_ready_raw,
      o.payment_terms,
      o.container_size,
      COALESCE(o.total_fcl,1) AS total_fcl,
      COALESCE(s.sold_fcl,0)::int AS sold_fcl,
      GREATEST(COALESCE(o.total_fcl,1) - COALESCE(s.sold_fcl,0)::int, 0) AS remaining_fcl,
      o.is_halal,
      o.is_kosher,
      o.created_at
    FROM offers o
    LEFT JOIN sold s ON s.offer_id = o.id
    WHERE o.deleted_at IS NULL AND o.status = 'active'
  )
  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb) INTO v_result FROM (
    SELECT jsonb_build_object(
      'id', b.id,
      'offer_number', b.offer_number,
      'origin_country', b.origin_country,
      'origin_port', b.origin_port,
      'shipment_month', b.shipment_month,
      'shipment_year', b.shipment_year,
      'shipment_ready_raw', b.shipment_ready_raw,
      'payment_terms', b.payment_terms,
      'container_size', b.container_size,
      'total_fcl', b.total_fcl,
      'sold_fcl', b.sold_fcl,
      'remaining_fcl', b.remaining_fcl,
      'is_halal', b.is_halal,
      'is_kosher', b.is_kosher,
      'created_at', b.created_at,
      'incoterms', COALESCE((
        SELECT jsonb_agg(incoterm_type)
          FROM offer_allowed_incoterms ai WHERE ai.offer_id = b.id
      ), '[]'::jsonb),
      'markets', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'country', c.english_name
        ))
          FROM offer_markets om
          JOIN markets m ON m.id = om.market_id
          LEFT JOIN countries c ON c.id = m.country_id
         WHERE om.offer_id = b.id
      ), '[]'::jsonb),
      'items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', oi.id,
          'amount', oi.amount,
          'price', oi.price,
          'condition', oi.condition,
          'product_name', cp.name,
          'category_code', pc.code,
          'category_name', pc.name_en,
          'aging_method', oi.aging_method,
          'us_grade', oi.us_grade
        ))
          FROM offer_items oi
          LEFT JOIN customer_products cp ON cp.id = oi.customer_product_id
          LEFT JOIN standard_products sp ON sp.id = cp.standard_product_id
          LEFT JOIN product_categories pc ON pc.id = sp.product_category_id
         WHERE oi.offer_id = b.id
      ), '[]'::jsonb)
    ) AS row
    FROM base b
    WHERE GREATEST(COALESCE(b.total_fcl,1) - COALESCE(b.sold_fcl,0), 0) > 0
    ORDER BY b.created_at DESC
    LIMIT 200
  ) q;

  RETURN v_result;
END;
$function$;