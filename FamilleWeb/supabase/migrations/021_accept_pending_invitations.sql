-- Lie automatiquement les invitations en attente à l'utilisateur connecté (même email).

CREATE OR REPLACE FUNCTION _link_user_to_invitation(v_invitation invitations)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_member_id UUID;
BEGIN
  SELECT id INTO v_family_member_id
  FROM family_members
  WHERE family_id = v_invitation.family_id
  AND (
    user_id = auth.uid()
    OR (lower(email) = lower(v_invitation.email) AND user_id IS NULL)
  )
  LIMIT 1;

  IF v_family_member_id IS NULL THEN
    INSERT INTO family_members (family_id, user_id, role, email, invitation_status)
    VALUES (v_invitation.family_id, auth.uid(), v_invitation.role, v_invitation.email, 'accepted')
    RETURNING id INTO v_family_member_id;
  ELSE
    UPDATE family_members
    SET user_id = auth.uid(),
        invitation_status = 'accepted',
        email = v_invitation.email
    WHERE id = v_family_member_id;
  END IF;

  UPDATE invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      family_member_id = v_family_member_id
  WHERE id = v_invitation.id;

  RETURN v_family_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION accept_invitation(invitation_token UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation invitations%ROWTYPE;
  v_user_email TEXT;
BEGIN
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = invitation_token
  AND status = 'pending'
  AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found, expired, or already used';
  END IF;

  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF lower(v_user_email) != lower(v_invitation.email) THEN
    RAISE EXCEPTION 'This invitation is not for your email address';
  END IF;

  RETURN _link_user_to_invitation(v_invitation);
END;
$$;

CREATE OR REPLACE FUNCTION accept_pending_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation invitations%ROWTYPE;
  v_user_email TEXT;
  v_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF v_user_email IS NULL THEN
    RETURN 0;
  END IF;

  FOR v_invitation IN
    SELECT *
    FROM invitations
    WHERE lower(email) = lower(v_user_email)
    AND status = 'pending'
    AND expires_at > NOW()
  LOOP
    PERFORM _link_user_to_invitation(v_invitation);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_pending_invitations() TO authenticated;
