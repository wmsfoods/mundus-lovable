ALTER TABLE public.negotiations
  ADD CONSTRAINT negotiations_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;