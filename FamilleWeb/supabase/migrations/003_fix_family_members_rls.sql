-- Create helper function to check if user is parent (avoids recursion)
CREATE OR REPLACE FUNCTION is_user_parent_of_family(p_family_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_creator BOOLEAN;
  is_parent BOOLEAN;
BEGIN
  -- Check if user is creator of the family
  SELECT created_by = p_user_id INTO is_creator
  FROM families
  WHERE id = p_family_id;
  
  IF is_creator THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a parent member
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id
    AND user_id = p_user_id
    AND role = 'parent'
  ) INTO is_parent;
  
  RETURN is_parent;
END;
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view family members of their families" ON family_members;
DROP POLICY IF EXISTS "Parents can add members to their families" ON family_members;
DROP POLICY IF EXISTS "Parents can update members of their families" ON family_members;
DROP POLICY IF EXISTS "Parents can delete members from their families" ON family_members;

-- Create helper function to check if user can view family (avoids recursion)
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
  
  -- Check if user is a member
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id
    AND user_id = p_user_id
  ) INTO is_member;
  
  RETURN is_member;
END;
$$;

-- Recreate SELECT policy (using helper function)
CREATE POLICY "Users can view family members of their families"
  ON family_members FOR SELECT
  USING (
    can_user_view_family(family_members.family_id, auth.uid())
  );

-- Recreate INSERT policy (allow creator or existing parents using helper function)
CREATE POLICY "Parents can add members to their families"
  ON family_members FOR INSERT
  WITH CHECK (
    is_user_parent_of_family(family_members.family_id, auth.uid())
  );

-- Recreate UPDATE policy (using helper function)
CREATE POLICY "Parents can update members of their families"
  ON family_members FOR UPDATE
  USING (
    is_user_parent_of_family(family_members.family_id, auth.uid())
  );

-- Recreate DELETE policy (using helper function)
CREATE POLICY "Parents can delete members from their families"
  ON family_members FOR DELETE
  USING (
    is_user_parent_of_family(family_members.family_id, auth.uid())
  );

