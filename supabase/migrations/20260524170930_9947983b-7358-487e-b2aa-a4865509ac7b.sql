DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.orders REPLICA IDENTITY FULL;