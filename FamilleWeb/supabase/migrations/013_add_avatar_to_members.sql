-- Add avatar_url column to family_members table
ALTER TABLE family_members 
ADD COLUMN avatar_url TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN family_members.avatar_url IS 'URL or identifier for the member avatar/icon';
