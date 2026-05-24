
ALTER TABLE public.shipment_containers
  ADD COLUMN IF NOT EXISTS bl_document_url text,
  ADD COLUMN IF NOT EXISTS bl_draft_url text,
  ADD COLUMN IF NOT EXISTS bl_extracted_data jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('bl-documents', 'bl-documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "bl_docs_public_read" ON storage.objects;
CREATE POLICY "bl_docs_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'bl-documents');

DROP POLICY IF EXISTS "bl_docs_auth_insert" ON storage.objects;
CREATE POLICY "bl_docs_auth_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bl-documents');

DROP POLICY IF EXISTS "bl_docs_auth_update" ON storage.objects;
CREATE POLICY "bl_docs_auth_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'bl-documents');

DROP POLICY IF EXISTS "bl_docs_auth_delete" ON storage.objects;
CREATE POLICY "bl_docs_auth_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'bl-documents');
