-- Create shared lists table
CREATE TABLE IF NOT EXISTS shared_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6', -- Default blue color
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shared list items table
CREATE TABLE IF NOT EXISTS shared_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES shared_lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  checked BOOLEAN DEFAULT FALSE,
  quantity TEXT, -- e.g., "2 kg", "1 pack", etc.
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shared_lists_family_id ON shared_lists(family_id);
CREATE INDEX IF NOT EXISTS idx_shared_list_items_list_id ON shared_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_shared_list_items_checked ON shared_list_items(checked);

-- Enable RLS
ALTER TABLE shared_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_list_items ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user can access a list (must be defined before policies)
CREATE OR REPLACE FUNCTION can_user_access_list(p_list_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
BEGIN
  SELECT family_id INTO v_family_id
  FROM shared_lists
  WHERE id = p_list_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN can_user_view_family(v_family_id, p_user_id);
END;
$$;

-- RLS Policies for shared_lists
CREATE POLICY "Family members can view shared lists"
  ON shared_lists FOR SELECT
  USING (
    can_user_view_family(shared_lists.family_id, auth.uid())
  );

CREATE POLICY "Family members can create shared lists"
  ON shared_lists FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND can_user_view_family(shared_lists.family_id, auth.uid())
  );

CREATE POLICY "Family members can update shared lists"
  ON shared_lists FOR UPDATE
  USING (
    can_user_view_family(shared_lists.family_id, auth.uid())
  );

CREATE POLICY "Family members can delete shared lists they created"
  ON shared_lists FOR DELETE
  USING (
    auth.uid() = created_by
    AND can_user_view_family(shared_lists.family_id, auth.uid())
  );

-- RLS Policies for shared_list_items
CREATE POLICY "Family members can view list items"
  ON shared_list_items FOR SELECT
  USING (
    can_user_access_list(shared_list_items.list_id, auth.uid())
  );

CREATE POLICY "Family members can create list items"
  ON shared_list_items FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND can_user_access_list(shared_list_items.list_id, auth.uid())
  );

CREATE POLICY "Family members can update list items"
  ON shared_list_items FOR UPDATE
  USING (
    can_user_access_list(shared_list_items.list_id, auth.uid())
  );

CREATE POLICY "Family members can delete list items"
  ON shared_list_items FOR DELETE
  USING (
    can_user_access_list(shared_list_items.list_id, auth.uid())
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_shared_lists_updated_at BEFORE UPDATE ON shared_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_list_items_updated_at BEFORE UPDATE ON shared_list_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

