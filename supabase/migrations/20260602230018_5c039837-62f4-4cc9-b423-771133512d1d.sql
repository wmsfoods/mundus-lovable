-- Auto-claim pending company invites for the authenticated user by email match.
-- When an admin invites someone (creates company_users row with their email), and that
-- person later signs in (e.g. via Google) before clicking the invite link, this RPC
-- links the auth user to the pending invite row(s) automatically.
CREATE OR REPLACE FUNCTION public.claim_pending_invites()
RETURNS TABLE(claimed_count integer, first_company_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_first uuid;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT 0, NULL::uuid;
    RETURN;
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RETURN QUERY SELECT 0, NULL::uuid;
    RETURN;
  END IF;

  -- Claim every company_users row matching this email and not yet linked.
  WITH updated AS (
    UPDATE public.company_users
       SET user_id     = v_uid,
           status      = CASE WHEN status IN ('invited','pending') THEN 'active' ELSE status END,
           accepted_at = COALESCE(accepted_at, now()),
           joined_at   = COALESCE(joined_at, now()),
           updated_at  = now()
     WHERE user_id IS NULL
       AND lower(email) = v_email
    RETURNING company_id
  )
  SELECT count(*)::int, min(company_id) INTO v_count, v_first FROM updated;

  -- Backfill public.users row + company link so the rest of the app works.
  IF v_count > 0 AND v_first IS NOT NULL THEN
    INSERT INTO public.users (id, company_id)
    VALUES (v_uid, v_first)
    ON CONFLICT (id) DO UPDATE
      SET company_id = COALESCE(public.users.company_id, EXCLUDED.company_id);
  END IF;

  RETURN QUERY SELECT v_count, v_first;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_pending_invites() TO authenticated;