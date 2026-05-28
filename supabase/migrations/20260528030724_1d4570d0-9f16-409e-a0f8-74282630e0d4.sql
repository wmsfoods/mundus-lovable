GRANT EXECUTE ON FUNCTION public.user_can_create_negotiation(uuid, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_access_negotiation(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_mundus_admin() TO authenticated, anon, service_role;