-- Update RLS policies to handle members without user_id

-- Drop and recreate the helper function to handle nullable user_id
CREATE OR REPLACE FUNCTION can_user_view_family(p_family_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_creator BOOLEAN;
  is_member BOOLEAN;
BEGIN
  -- Check if user is creator of the family
  SELECT created_by = p_user_id INTO is_creator
  FROM families
  WHERE id = p_family_id;
  
  IF is_creator THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a member (with account)
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id
    AND user_id = p_user_id
    AND user_id IS NOT NULL
  ) INTO is_member;
  
  RETURN is_member;
END;
$$;

-- Update SELECT policy for family_members to allow viewing members without accounts
DROP POLICY IF EXISTS "Users can view family members of their families" ON family_members;

CREATE POLICY "Users can view family members of their families"
  ON family_members FOR SELECT
  USING (
    can_user_view_family(family_members.family_id, auth.uid())
  );

-- Update INSERT policy to allow creating members without user_id
DROP POLICY IF EXISTS "Parents can add members to their families" ON family_members;

-- Single INSERT policy that handles both cases: members with and without accounts
CREATE POLICY "Parents can add members to their families"
  ON family_members FOR INSERT
  WITH CHECK (
    is_user_parent_of_family(family_members.family_id, auth.uid())
    AND (
      -- Allow creating member without account (email required)
      (family_members.user_id IS NULL AND family_members.email IS NOT NULL)
      OR
      -- Allow creating member with account (user_id must be provided)
      (family_members.user_id IS NOT NULL)
    )
  );

