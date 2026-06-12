-- Extend table
ALTER TABLE public.company_documents
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS cert_type text,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS product_category text,
  ADD COLUMN IF NOT EXISTS meat_cut text,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Backfill from legacy columns
UPDATE public.company_documents
   SET title = COALESCE(title, name)
 WHERE title IS NULL;

UPDATE public.company_documents
   SET category = COALESCE(category, 'company_doc')
 WHERE category IS NULL;

UPDATE public.company_documents
   SET file_size_bytes = COALESCE(file_size_bytes, file_size)
 WHERE file_size_bytes IS NULL AND file_size IS NOT NULL;

UPDATE public.company_documents
   SET file_type = COALESCE(file_type, mime_type)
 WHERE file_type IS NULL AND mime_type IS NOT NULL;

ALTER TABLE public.company_documents
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN category SET DEFAULT 'company_doc';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'company_documents_category_check'
  ) THEN
    ALTER TABLE public.company_documents
      ADD CONSTRAINT company_documents_category_check
      CHECK (category IN ('company_doc','certification','product_spec'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_docs_company_category
  ON public.company_documents (company_id, category);
CREATE INDEX IF NOT EXISTS idx_company_docs_company_published
  ON public.company_documents (company_id, is_published);

-- Buyer SELECT policy: published docs only, authenticated buyers
DROP POLICY IF EXISTS "company_docs_buyer_published" ON public.company_documents;
CREATE POLICY "company_docs_buyer_published"
  ON public.company_documents
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Lock down PUBLIC/anon
REVOKE ALL ON public.company_documents FROM PUBLIC;
REVOKE ALL ON public.company_documents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_documents TO authenticated;
GRANT ALL ON public.company_documents TO service_role;

-- Helper: does a company have any published documents?
CREATE OR REPLACE FUNCTION public.company_has_published_documents(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.company_documents
     WHERE company_id = p_company_id
       AND is_published = true
  );
$$;

REVOKE ALL ON FUNCTION public.company_has_published_documents(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.company_has_published_documents(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.company_has_published_documents(uuid) TO authenticated;

-- Storage policies on the private bucket
DROP POLICY IF EXISTS "company_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "company_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "company_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "company_documents_delete" ON storage.objects;

CREATE POLICY "company_documents_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND (
      public.is_mundus_admin()
      OR split_part(name, '/', 1) = public.current_user_company_id()::text
    )
  );

CREATE POLICY "company_documents_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-documents'
    AND (
      public.is_mundus_admin()
      OR split_part(name, '/', 1) = public.current_user_company_id()::text
    )
  );

CREATE POLICY "company_documents_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND (
      public.is_mundus_admin()
      OR split_part(name, '/', 1) = public.current_user_company_id()::text
    )
  );

CREATE POLICY "company_documents_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-documents'
    AND (
      public.is_mundus_admin()
      OR split_part(name, '/', 1) = public.current_user_company_id()::text
    )
  );