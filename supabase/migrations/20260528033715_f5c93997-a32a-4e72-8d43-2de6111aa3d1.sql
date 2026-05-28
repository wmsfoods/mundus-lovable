REVOKE EXECUTE ON FUNCTION public.current_user_company_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_can_create_negotiation(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_company_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_company_ids() TO service_role;
GRANT EXECUTE ON FUNCTION public.user_can_create_negotiation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_create_negotiation(uuid, uuid) TO service_role;