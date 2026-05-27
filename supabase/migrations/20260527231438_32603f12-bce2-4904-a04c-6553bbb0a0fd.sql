REVOKE ALL ON FUNCTION public.user_can_create_negotiation(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_can_create_negotiation(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_can_create_negotiation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_create_negotiation(uuid, uuid) TO service_role;