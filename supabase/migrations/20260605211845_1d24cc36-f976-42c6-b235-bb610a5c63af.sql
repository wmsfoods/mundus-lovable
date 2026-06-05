-- 1. Add is_default column
ALTER TABLE public.supplier_brands
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS supplier_brands_one_default_per_company
  ON public.supplier_brands(company_id)
  WHERE is_default;

-- 2. Trigger: when a row is set as default, demote any previous default
CREATE OR REPLACE FUNCTION public.supplier_brands_enforce_single_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.supplier_brands
      SET is_default = false
      WHERE company_id = NEW.company_id
        AND id <> NEW.id
        AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supplier_brands_single_default ON public.supplier_brands;
CREATE TRIGGER supplier_brands_single_default
AFTER INSERT OR UPDATE OF is_default ON public.supplier_brands
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.supplier_brands_enforce_single_default();

-- 3. Grants (in case they were missing)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_brands TO authenticated;
GRANT ALL ON public.supplier_brands TO service_role;

-- 4. Add INSERT / UPDATE / DELETE policies (SELECT already exists)
DROP POLICY IF EXISTS "Admins or company members can insert brands" ON public.supplier_brands;
CREATE POLICY "Admins or company members can insert brands"
ON public.supplier_brands
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_mundus_admin()
  OR company_id IN (SELECT public.current_user_company_ids())
);

DROP POLICY IF EXISTS "Admins or company members can update brands" ON public.supplier_brands;
CREATE POLICY "Admins or company members can update brands"
ON public.supplier_brands
FOR UPDATE
TO authenticated
USING (
  public.is_mundus_admin()
  OR company_id IN (SELECT public.current_user_company_ids())
)
WITH CHECK (
  public.is_mundus_admin()
  OR company_id IN (SELECT public.current_user_company_ids())
);

DROP POLICY IF EXISTS "Admins or company members can delete brands" ON public.supplier_brands;
CREATE POLICY "Admins or company members can delete brands"
ON public.supplier_brands
FOR DELETE
TO authenticated
USING (
  public.is_mundus_admin()
  OR company_id IN (SELECT public.current_user_company_ids())
);