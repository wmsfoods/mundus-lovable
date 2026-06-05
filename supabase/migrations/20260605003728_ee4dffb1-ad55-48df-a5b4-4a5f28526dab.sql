
CREATE TABLE IF NOT EXISTS public.supplier_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS supplier_brands_unique_name_per_company
  ON public.supplier_brands(company_id, lower(name));
CREATE INDEX IF NOT EXISTS supplier_brands_company_idx
  ON public.supplier_brands(company_id);

GRANT SELECT ON public.supplier_brands TO authenticated;
GRANT ALL ON public.supplier_brands TO service_role;

ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own company brands"
  ON public.supplier_brands
  FOR SELECT
  TO authenticated
  USING (company_id IN (SELECT public.current_user_company_ids()));

CREATE OR REPLACE FUNCTION public.create_or_find_supplier_brand(
  p_company_id uuid,
  p_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean text;
  v_existing public.supplier_brands;
  v_new public.supplier_brands;
  v_authorized boolean;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'company_id_required');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.current_user_company_ids() AS cid WHERE cid = p_company_id
  ) INTO v_authorized;
  IF NOT v_authorized THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  v_clean := btrim(coalesce(p_name, ''));
  IF v_clean = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'name_required');
  END IF;

  SELECT * INTO v_existing
  FROM public.supplier_brands
  WHERE company_id = p_company_id
    AND lower(name) = lower(v_clean)
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'brand_id', v_existing.id, 'name', v_existing.name, 'created', false);
  END IF;

  INSERT INTO public.supplier_brands (company_id, name, created_by)
  VALUES (p_company_id, v_clean, auth.uid())
  RETURNING * INTO v_new;

  RETURN jsonb_build_object('ok', true, 'brand_id', v_new.id, 'name', v_new.name, 'created', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_or_find_supplier_brand(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_supplier_brands(
  p_company_id uuid,
  p_query text DEFAULT ''
)
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q text;
  v_authorized boolean;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.current_user_company_ids() AS cid WHERE cid = p_company_id
  ) INTO v_authorized;
  IF NOT v_authorized THEN
    RETURN;
  END IF;
  v_q := btrim(coalesce(p_query, ''));
  RETURN QUERY
  SELECT b.id, b.name
  FROM public.supplier_brands b
  WHERE b.company_id = p_company_id
    AND (v_q = '' OR b.name ILIKE '%' || v_q || '%')
  ORDER BY b.name ASC
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_supplier_brands(uuid, text) TO authenticated;

ALTER TABLE public.offer_items
  ADD COLUMN IF NOT EXISTS brand_id uuid NULL REFERENCES public.supplier_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes text NULL,
  ADD COLUMN IF NOT EXISTS photo_url text NULL,
  ADD COLUMN IF NOT EXISTS files_urls text[] NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS offer_items_brand_id_idx ON public.offer_items(brand_id);
