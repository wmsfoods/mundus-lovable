
-- 1) Enqueue email RPC (SECURITY DEFINER) so authenticated users can insert + get id back
CREATE OR REPLACE FUNCTION public.enqueue_email(
  p_to_email text,
  p_subject text,
  p_html_body text,
  p_template_name text,
  p_template_vars jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.email_queue (to_email, subject, html_body, template_name, template_vars, status)
  VALUES (p_to_email, p_subject, p_html_body, p_template_name, COALESCE(p_template_vars, '{}'::jsonb), 'queued')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_email(text,text,text,text,jsonb) TO authenticated;

-- 2) Cross-company contact lookup for negotiation counterparties (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_company_primary_contact(p_company_id uuid)
RETURNS TABLE(email text, full_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  -- Allow: admin, same company, or any company sharing a negotiation with target
  IF NOT (
    public.is_mundus_admin()
    OR p_company_id IN (SELECT public.current_user_company_ids())
    OR EXISTS (
      SELECT 1
      FROM public.negotiations n
      JOIN public.offers o ON o.id = n.offer_id
      WHERE (n.buyer_company_id = p_company_id OR o.supplier_id = p_company_id)
        AND (
          n.buyer_company_id IN (SELECT public.current_user_company_ids())
          OR o.supplier_id IN (SELECT public.current_user_company_ids())
        )
    )
  ) THEN
    RETURN;
  END IF;

  -- Prefer master role, then any active, then any
  RETURN QUERY
  WITH ranked AS (
    SELECT cu.email, cu.full_name,
      CASE WHEN cu.role ILIKE '%master%' THEN 0 ELSE 1 END AS r1,
      CASE WHEN COALESCE(cu.status,'active') = 'active' THEN 0 ELSE 1 END AS r2
    FROM public.company_users cu
    WHERE cu.company_id = p_company_id AND cu.email IS NOT NULL
  )
  SELECT email, full_name FROM ranked ORDER BY r1, r2 LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT u.email, u.full_name FROM public.users u
  WHERE (u.company_id = p_company_id OR u.active_company_id = p_company_id)
    AND u.email IS NOT NULL
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_company_primary_contact(uuid) TO authenticated;
