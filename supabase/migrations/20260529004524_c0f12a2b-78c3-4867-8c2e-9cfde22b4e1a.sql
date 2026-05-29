
DROP POLICY IF EXISTS "negotiation_tokens_admin_select" ON public.negotiation_tokens;
DROP POLICY IF EXISTS "negotiation_tokens_insert_admin" ON public.negotiation_tokens;
DROP POLICY IF EXISTS "negotiation_tokens_update_admin" ON public.negotiation_tokens;
DROP POLICY IF EXISTS "negotiation_tokens_select" ON public.negotiation_tokens;
DROP POLICY IF EXISTS "negotiation_tokens_insert" ON public.negotiation_tokens;
DROP POLICY IF EXISTS "negotiation_tokens_update" ON public.negotiation_tokens;

CREATE POLICY "negotiation_tokens_select" ON public.negotiation_tokens
FOR SELECT TO authenticated
USING (public.user_can_access_negotiation(negotiation_id));

CREATE POLICY "negotiation_tokens_insert" ON public.negotiation_tokens
FOR INSERT TO authenticated
WITH CHECK (public.user_can_access_negotiation(negotiation_id));

CREATE POLICY "negotiation_tokens_update" ON public.negotiation_tokens
FOR UPDATE TO authenticated
USING (public.user_can_access_negotiation(negotiation_id));
