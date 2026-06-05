CREATE OR REPLACE FUNCTION public.get_company_recipient_emails(p_company_ids uuid[])
RETURNS TABLE(company_id uuid, email text, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (u.company_id) u.company_id, u.email, u.name
  FROM public.users u
  WHERE u.company_id = ANY(p_company_ids)
    AND COALESCE(u.status, 'active') = 'active'
    AND u.deleted_at IS NULL
    AND u.email IS NOT NULL
  ORDER BY u.company_id, u.created_at ASC NULLS LAST
$$;

GRANT EXECUTE ON FUNCTION public.get_company_recipient_emails(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_recipient_emails(uuid[]) TO service_role;