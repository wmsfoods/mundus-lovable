-- Restore missing GRANTs on user_requests so PostgREST can execute
-- the public signup insert (anon) and admin/owner reads (authenticated).
GRANT SELECT, INSERT, UPDATE ON public.user_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_requests TO authenticated;
GRANT ALL ON public.user_requests TO service_role;