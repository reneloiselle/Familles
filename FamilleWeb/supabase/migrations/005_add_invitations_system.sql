-- Add email and invitation status to family_members
-- Make user_id nullable to allow members without accounts
ALTER TABLE family_members 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'pending' CHECK (invitation_status IN ('pending', 'accepted', 'declined'));

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  token UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

-- Create indexes for invitations
CREATE INDEX IF NOT EXISTS idx_invitations_family_id ON invitations(family_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Enable RLS on invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (in case of re-run)
DROP POLICY IF EXISTS "Users can view invitations for their families" ON invitations;
DROP POLICY IF EXISTS "Parents can create invitations" ON invitations;
DROP POLICY IF EXISTS "Parents can update invitations" ON invitations;
DROP POLICY IF EXISTS "Users can accept invitations sent to their email" ON invitations;

-- RLS Policies for invitations
CREATE POLICY "Users can view invitations for their families"
  ON invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM families f
      WHERE f.id = invitations.family_id
      AND (
        f.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM family_members fm
          WHERE fm.family_id = invitations.family_id
          AND fm.user_id = auth.uid()
          AND fm.role = 'parent'
        )
      )
    )
    OR
    -- User can see invitations sent to their email
    invitations.email = get_user_email(auth.uid())
  );

CREATE POLICY "Parents can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM families f
      WHERE f.id = invitations.family_id
      AND (
        f.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM family_members fm
          WHERE fm.family_id = invitations.family_id
          AND fm.user_id = auth.uid()
          AND fm.role = 'parent'
        )
      )
    )
    AND auth.uid() = invitations.invited_by
  );

CREATE POLICY "Parents can update invitations"
  ON invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM families f
      WHERE f.id = invitations.family_id
      AND (
        f.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM family_members fm
          WHERE fm.family_id = invitations.family_id
          AND fm.user_id = auth.uid()
          AND fm.role = 'parent'
        )
      )
    )
  );

CREATE POLICY "Users can accept invitations sent to their email"
  ON invitations FOR UPDATE
  USING (
    invitations.email = get_user_email(auth.uid())
    AND invitations.status = 'pending'
    AND invitations.expires_at > NOW()
  )
  WITH CHECK (
    invitations.status = 'accepted'
  );

-- Update family_members constraint to allow nullable user_id
-- Remove the NOT NULL constraint on user_id
ALTER TABLE family_members 
  ALTER COLUMN user_id DROP NOT NULL;

-- Update the unique constraint to allow multiple members with same email but different user_id
-- We need to handle the case where user_id is NULL
-- First, drop the existing UNIQUE constraint (the constraint name is family_members_family_id_user_id_key)
ALTER TABLE family_members 
  DROP CONSTRAINT IF EXISTS family_members_family_id_user_id_key;

-- Create partial unique indexes to handle nullable user_id
-- One for members with user_id (existing members with accounts)
CREATE UNIQUE INDEX IF NOT EXISTS family_members_family_id_user_id_unique 
  ON family_members(family_id, user_id) 
  WHERE user_id IS NOT NULL;

-- One for members without user_id but with email (pending invitations)
CREATE UNIQUE INDEX IF NOT EXISTS family_members_family_id_email_unique 
  ON family_members(family_id, email) 
  WHERE email IS NOT NULL AND user_id IS NULL;

-- Function to accept an invitation and link user account
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation invitations%ROWTYPE;
  v_family_member_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = invitation_token
  AND status = 'pending'
  AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found, expired, or already used';
  END IF;
  
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  IF v_user_email != v_invitation.email THEN
    RAISE EXCEPTION 'This invitation is not for your email address';
  END IF;
  
  -- Find or create family member
  SELECT id INTO v_family_member_id
  FROM family_members
  WHERE family_id = v_invitation.family_id
  AND (
    (user_id = auth.uid())
    OR (email = v_invitation.email AND user_id IS NULL)
  )
  LIMIT 1;
  
  IF v_family_member_id IS NULL THEN
    -- Create new family member
    INSERT INTO family_members (family_id, user_id, role, email, invitation_status)
    VALUES (v_invitation.family_id, auth.uid(), v_invitation.role, v_invitation.email, 'accepted')
    RETURNING id INTO v_family_member_id;
  ELSE
    -- Update existing member to link user account
    UPDATE family_members
    SET user_id = auth.uid(),
        invitation_status = 'accepted',
        email = v_invitation.email
    WHERE id = v_family_member_id;
  END IF;
  
  -- Update invitation status
  UPDATE invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      family_member_id = v_family_member_id
  WHERE id = v_invitation.id;
  
  RETURN v_family_member_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION accept_invitation(UUID) TO authenticated;

