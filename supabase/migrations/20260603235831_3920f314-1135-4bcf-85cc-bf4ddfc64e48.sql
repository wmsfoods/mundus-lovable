CREATE OR REPLACE FUNCTION public.resolve_customer_product(p_company_id uuid, p_cut_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_cut RECORD;
  v_category_id uuid;
  v_standard_product_id uuid;
  v_customer_product_id uuid;
  v_cat_code text;
BEGIN
  IF NOT (
    public.is_mundus_admin()
    OR p_company_id = public.current_user_company_id()
    OR EXISTS (
      SELECT 1 FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_id = p_company_id
        AND COALESCE(cu.status, 'active') = 'active'
    )
  ) THEN
    RAISE EXCEPTION 'not_authorized_for_company';
  END IF;

  SELECT id, name, product_number, category
    INTO v_cut
  FROM public.cuts
  WHERE id = p_cut_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'cut_not_found: %', p_cut_id;
  END IF;

  v_cat_code := lower(coalesce(v_cut.category, 'beef'));
  SELECT id INTO v_category_id
  FROM public.product_categories
  WHERE code = v_cat_code
  LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO public.product_categories (code, name_en)
    VALUES (v_cat_code, initcap(v_cat_code))
    RETURNING id INTO v_category_id;
  END IF;

  IF v_cut.product_number IS NOT NULL THEN
    SELECT id INTO v_standard_product_id
    FROM public.standard_products
    WHERE product_number = v_cut.product_number
    LIMIT 1;
  END IF;
  IF v_standard_product_id IS NULL THEN
    SELECT id INTO v_standard_product_id
    FROM public.standard_products
    WHERE lower(description) = lower(v_cut.name)
      AND product_category_id = v_category_id
    LIMIT 1;
  END IF;

  IF v_standard_product_id IS NULL THEN
    IF v_cut.product_number IS NOT NULL THEN
      INSERT INTO public.standard_products (product_category_id, description, is_active, product_number)
      VALUES (v_category_id, v_cut.name, true, v_cut.product_number)
      RETURNING id INTO v_standard_product_id;
    ELSE
      INSERT INTO public.standard_products (product_category_id, description, is_active)
      VALUES (v_category_id, v_cut.name, true)
      RETURNING id INTO v_standard_product_id;
    END IF;
  END IF;

  SELECT id INTO v_customer_product_id
  FROM public.customer_products
  WHERE company_id = p_company_id
    AND standard_product_id = v_standard_product_id
  LIMIT 1;
  IF v_customer_product_id IS NULL THEN
    INSERT INTO public.customer_products (company_id, standard_product_id, name, is_active)
    VALUES (p_company_id, v_standard_product_id, v_cut.name, true)
    RETURNING id INTO v_customer_product_id;
  END IF;

  RETURN v_customer_product_id;
END;
$function$;