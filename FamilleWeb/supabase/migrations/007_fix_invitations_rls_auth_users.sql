-- Fix RLS policies that try to access auth.users directly
-- They should use the get_user_email() function instead

-- Drop and recreate the SELECT policy for invitations
DROP POLICY IF EXISTS "Users can view invitations for their families" ON invitations;

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
    -- User can see invitations sent to their email (using function instead of direct access)
    invitations.email = get_user_email(auth.uid())
  );

-- Drop and recreate the UPDATE policy for accepting invitations
DROP POLICY IF EXISTS "Users can accept invitations sent to their email" ON invitations;

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

