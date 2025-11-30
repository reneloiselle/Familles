-- Function to get user email from user_id (for RLS-safe access)
CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_uuid;
  
  RETURN user_email;
END;
$$;

-- Function to find user_id by email (for adding family members)
CREATE OR REPLACE FUNCTION find_user_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  found_user_id UUID;
BEGIN
  SELECT id INTO found_user_id
  FROM auth.users
  WHERE email = user_email;
  
  RETURN found_user_id;
END;
$$;

-- Create a view that joins family_members with user emails
CREATE OR REPLACE VIEW family_members_with_email AS
SELECT 
  fm.id,
  fm.family_id,
  fm.user_id,
  fm.role,
  fm.created_at,
  get_user_email(fm.user_id) as email
FROM family_members fm;

-- Grant access to authenticated users
GRANT SELECT ON family_members_with_email TO authenticated;

