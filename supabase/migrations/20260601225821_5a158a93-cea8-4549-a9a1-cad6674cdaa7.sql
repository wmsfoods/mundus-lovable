-- ============ Public showcase + lead capture ============

-- 1) crm_contacts.mundus_rep (text, app-validated enum; will migrate to user FK later)
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS mundus_rep text;

-- 2) public_lead_sessions: audit/anti-spam log for anonymous lead capture
CREATE TABLE IF NOT EXISTS public.public_lead_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_public_lead_sessions_email_created
  ON public.public_lead_sessions (lower(email), created_at DESC);

GRANT ALL ON public.public_lead_sessions TO service_role;
ALTER TABLE public.public_lead_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: only SECURITY DEFINER RPCs (running as definer/service) write here.

-- 3) get_public_offers: masked public listing of active offers
CREATE OR REPLACE FUNCTION public.get_public_offers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
          'category_name', pc.name_en
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
$$;

GRANT EXECUTE ON FUNCTION public.get_public_offers() TO anon, authenticated;

-- 4) public_lookup_contact: anonymous-safe contact lookup
CREATE OR REPLACE FUNCTION public.public_lookup_contact(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email,'')));
  v_contact_id uuid;
  v_company_id uuid;
  v_has_account boolean := false;
BEGIN
  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('found', false, 'has_mundus_account', false);
  END IF;

  SELECT id, company_id INTO v_contact_id, v_company_id
    FROM crm_contacts WHERE lower(email) = v_email LIMIT 1;

  SELECT EXISTS (SELECT 1 FROM users WHERE lower(email) = v_email)
    INTO v_has_account;

  RETURN jsonb_build_object(
    'found', v_contact_id IS NOT NULL,
    'has_mundus_account', v_has_account,
    'contact_id', v_contact_id,
    'company_id', v_company_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_lookup_contact(text) TO anon, authenticated;

-- 5) public_capture_lead: anonymous capture into crm + audit log
CREATE OR REPLACE FUNCTION public.public_capture_lead(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_payload->>'email','')));
  v_name text := nullif(trim(coalesce(p_payload->>'name','')),'');
  v_company text := nullif(trim(coalesce(p_payload->>'company','')),'');
  v_phone text := nullif(trim(coalesce(p_payload->>'phone','')),'');
  v_country text := nullif(trim(coalesce(p_payload->>'country','')),'');
  v_protein text := nullif(trim(coalesce(p_payload->>'protein','')),'');
  v_lead_type text := nullif(trim(coalesce(p_payload->>'lead_type','')),'');
  v_rep text := nullif(trim(coalesce(p_payload->>'mundus_rep','')),'');
  v_lang text := nullif(trim(coalesce(p_payload->>'lang','')),'');
  v_recent int;
  v_company_id uuid;
  v_contact_id uuid;
BEGIN
  IF v_email = '' OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE='22023';
  END IF;
  IF v_lead_type IS NOT NULL AND v_lead_type NOT IN ('buyer','supplier','buyer_supplier') THEN
    RAISE EXCEPTION 'invalid_lead_type' USING ERRCODE='22023';
  END IF;

  -- Rate limit: max 5 captures per email in the last 10 minutes
  SELECT count(*) INTO v_recent FROM public_lead_sessions
    WHERE lower(email) = v_email AND created_at > now() - interval '10 minutes';
  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE='P0003';
  END IF;

  -- Upsert crm company (best-effort match by name; otherwise create)
  IF v_company IS NOT NULL THEN
    SELECT id INTO v_company_id FROM crm_companies
      WHERE lower(name) = lower(v_company) AND COALESCE(is_active,true)
      ORDER BY created_at LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    INSERT INTO crm_companies (name, country, source, source_detail, company_type, stage, lead_type)
    VALUES (
      COALESCE(v_company, split_part(v_email,'@',2)),
      v_country, 'public_home', 'public_home_chat', 'prospect', 'cold', v_lead_type
    ) RETURNING id INTO v_company_id;
  ELSE
    UPDATE crm_companies
      SET lead_type = COALESCE(lead_type, v_lead_type),
          country = COALESCE(country, v_country)
    WHERE id = v_company_id;
  END IF;

  -- Upsert contact by lowercased email
  SELECT id INTO v_contact_id FROM crm_contacts WHERE lower(email) = v_email LIMIT 1;
  IF v_contact_id IS NULL THEN
    INSERT INTO crm_contacts (
      company_id, email, full_name, phone, country,
      preferred_language, products_of_interest, lead_source, mundus_rep
    ) VALUES (
      v_company_id, v_email, COALESCE(v_name, v_email), v_phone, v_country,
      COALESCE(v_lang,'en'),
      CASE WHEN v_protein IS NULL THEN NULL ELSE ARRAY[v_protein] END,
      'public_home_chat', v_rep
    ) RETURNING id INTO v_contact_id;
  ELSE
    UPDATE crm_contacts SET
      full_name = COALESCE(full_name, v_name),
      phone = COALESCE(phone, v_phone),
      country = COALESCE(country, v_country),
      preferred_language = COALESCE(preferred_language, v_lang),
      products_of_interest = COALESCE(products_of_interest,
        CASE WHEN v_protein IS NULL THEN NULL ELSE ARRAY[v_protein] END),
      mundus_rep = COALESCE(mundus_rep, v_rep),
      company_id = COALESCE(company_id, v_company_id)
    WHERE id = v_contact_id;
  END IF;

  INSERT INTO public_lead_sessions (email, payload, ip, user_agent)
  VALUES (
    v_email, p_payload,
    nullif(p_payload->>'_ip',''), nullif(p_payload->>'_ua','')
  );

  RETURN jsonb_build_object(
    'success', true,
    'contact_id', v_contact_id,
    'company_id', v_company_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_capture_lead(jsonb) TO anon, authenticated;