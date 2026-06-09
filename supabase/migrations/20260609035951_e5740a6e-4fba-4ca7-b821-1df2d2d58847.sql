DROP FUNCTION IF EXISTS public.get_supplier_customer_companies(uuid);

CREATE OR REPLACE FUNCTION public.get_supplier_customer_companies(p_office_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  country text,
  tax_id text,
  phone text,
  contact_name text,
  contact_email text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id,
    c.name,
    c.country,
    c.tax_id,
    c.phone,
    cu.contact_name,
    cu.contact_email
  FROM public.companies c
  JOIN public.supplier_customer_links scl ON scl.buyer_company_id = c.id
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(NULLIF(u.full_name, ''), NULLIF(u.email, '')) AS contact_name,
      u.email AS contact_email
    FROM public.company_users u
    WHERE u.company_id = c.id
      AND COALESCE(u.status, 'active') = 'active'
    ORDER BY
      (u.role = 'owner') DESC NULLS LAST,
      u.joined_at ASC NULLS LAST,
      u.created_at ASC NULLS LAST
    LIMIT 1
  ) cu ON TRUE
  WHERE scl.supplier_office_id = p_office_id
    AND c.id IS NOT NULL;
$function$;

GRANT EXECUTE ON FUNCTION public.get_supplier_customer_companies(uuid) TO authenticated, service_role;