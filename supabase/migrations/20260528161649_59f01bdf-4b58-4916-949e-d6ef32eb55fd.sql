-- Add token-based fields to team_invitations for email invite flow
ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE UNIQUE INDEX IF NOT EXISTS team_invitations_token_key ON public.team_invitations(token);

-- Allow public (anon) to look up an invitation by token (for the accept page)
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.team_invitations;
CREATE POLICY "Anyone can read invitation by token"
  ON public.team_invitations FOR SELECT
  TO anon, authenticated
  USING (token IS NOT NULL AND accepted_at IS NULL AND (expires_at IS NULL OR expires_at > now()));

GRANT SELECT ON public.team_invitations TO anon;

-- RPC to accept an invitation and activate the company_users row
CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
BEGIN
  SELECT * INTO v_inv FROM public.team_invitations
  WHERE token = p_token AND accepted_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_token' USING ERRCODE = 'P0001';
  END IF;

  -- Link or create company_users row
  UPDATE public.company_users
     SET user_id = p_user_id,
         status = 'active',
         accepted_at = now(),
         joined_at = COALESCE(joined_at, now())
   WHERE company_id = v_inv.company_id
     AND lower(email) = lower(v_inv.email);

  IF NOT FOUND THEN
    INSERT INTO public.company_users (company_id, user_id, full_name, email, role, status, joined_at, accepted_at, job_title, phone, notes)
    VALUES (v_inv.company_id, p_user_id, v_inv.full_name, v_inv.email, v_inv.profile_type, 'active', now(), now(), v_inv.job_title, v_inv.phone, v_inv.notes);
  END IF;

  UPDATE public.team_invitations
     SET accepted_at = now(), auth_user_id = p_user_id, account_status = 'active'
   WHERE id = v_inv.id;

  RETURN jsonb_build_object('ok', true, 'company_id', v_inv.company_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_team_invitation(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.accept_team_invitation(uuid, uuid) FROM anon, public;