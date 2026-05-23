ALTER TABLE public.user_offices DROP CONSTRAINT IF EXISTS user_offices_user_id_fkey;

ALTER TABLE public.user_offices
  ADD CONSTRAINT user_offices_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;