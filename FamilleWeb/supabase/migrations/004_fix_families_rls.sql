-- Drop existing SELECT policy for families that requires membership
DROP POLICY IF EXISTS "Users can view families they are members of" ON families;

-- Recreate SELECT policy that allows creators to see their families
-- even before they are added as members
CREATE POLICY "Users can view families they are members of"
  ON families FOR SELECT
  USING (
    -- User is the creator (allows viewing during creation)
    created_by = auth.uid()
    OR
    -- User is a member of the family
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
      AND family_members.user_id = auth.uid()
    )
  );

-- Ensure INSERT policy allows authenticated users to create families
-- Drop and recreate to be sure
DROP POLICY IF EXISTS "Users can create families" ON families;

CREATE POLICY "Users can create families"
  ON families FOR INSERT
  WITH CHECK (
    -- User must be authenticated and must be the creator
    auth.uid() IS NOT NULL
    AND auth.uid() = created_by
  );

