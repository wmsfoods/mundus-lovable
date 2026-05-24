
ALTER TABLE public.buyer_requests
  ADD COLUMN IF NOT EXISTS origin_countries text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS any_origin boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('request-attachments', 'request-attachments', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='request_attachments_read') THEN
    CREATE POLICY "request_attachments_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'request-attachments');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='request_attachments_insert') THEN
    CREATE POLICY "request_attachments_insert" ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'request-attachments');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='request_attachments_update') THEN
    CREATE POLICY "request_attachments_update" ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'request-attachments');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='request_attachments_delete') THEN
    CREATE POLICY "request_attachments_delete" ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'request-attachments');
  END IF;
END $$;
