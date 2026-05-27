-- Add color column to family_members for persistent member identity
ALTER TABLE family_members
ADD COLUMN color TEXT;

COMMENT ON COLUMN family_members.color IS 'Hex color (#RRGGBB) for member visual identity';

-- Backfill existing members with palette colors (8-color rotation per family)
WITH numbered AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (PARTITION BY family_id ORDER BY created_at) - 1) % 8 AS color_idx
  FROM family_members
  WHERE color IS NULL
)
UPDATE family_members fm
SET color = (ARRAY[
  '#3b82f6', -- blue-500
  '#10b981', -- emerald-500
  '#8b5cf6', -- violet-500
  '#f59e0b', -- amber-500
  '#f43f5e', -- rose-500
  '#06b6d4', -- cyan-500
  '#f97316', -- orange-500
  '#6366f1'  -- indigo-500
])[numbered.color_idx + 1]
FROM numbered
WHERE fm.id = numbered.id;

-- Trigger: assign default color on insert when not provided
CREATE OR REPLACE FUNCTION assign_default_member_color()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  member_count INTEGER;
BEGIN
  IF NEW.color IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO member_count
  FROM family_members
  WHERE family_id = NEW.family_id;

  NEW.color := (ARRAY[
    '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
    '#f43f5e', '#06b6d4', '#f97316', '#6366f1'
  ])[(member_count % 8) + 1];

  RETURN NEW;
END;
$$;

CREATE TRIGGER family_members_assign_color
  BEFORE INSERT ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_member_color();

-- Trigger: prevent non-parent members from changing privileged fields
CREATE OR REPLACE FUNCTION protect_family_member_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Parents (and family creator via is_user_parent_of_family) may change anything
  IF is_user_parent_of_family(OLD.family_id, auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Self-update only: block changes to privileged columns
  IF OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
    OR NEW.family_id IS DISTINCT FROM OLD.family_id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.email IS DISTINCT FROM OLD.email
    OR NEW.invitation_status IS DISTINCT FROM OLD.invitation_status
  THEN
    RAISE EXCEPTION 'Cannot modify privileged member fields';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER family_members_protect_privileged_fields
  BEFORE UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION protect_family_member_privileged_fields();

-- RLS: members can update their own profile (name, avatar, color)
CREATE POLICY "Members can update own profile"
  ON family_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
