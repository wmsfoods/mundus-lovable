DROP POLICY IF EXISTS "Admins manage distributions" ON public.offer_distributions;

CREATE POLICY "Admins manage distributions"
ON public.offer_distributions
FOR ALL
TO authenticated
USING (public.is_mundus_admin())
WITH CHECK (public.is_mundus_admin());