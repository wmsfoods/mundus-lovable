ALTER TABLE public.negotiation_messages REPLICA IDENTITY FULL;
ALTER TABLE public.negotiations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiations;