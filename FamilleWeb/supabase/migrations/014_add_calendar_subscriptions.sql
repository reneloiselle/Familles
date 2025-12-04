-- Create calendar_subscriptions table
CREATE TABLE calendar_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6', -- Default blue
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE calendar_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view subscriptions for their family" ON calendar_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = calendar_subscriptions.family_member_id
      AND (
        -- User is the member
        fm.user_id = auth.uid()
        OR
        -- User is a parent in the same family
        EXISTS (
          SELECT 1 FROM family_members parent
          WHERE parent.family_id = fm.family_id
          AND parent.user_id = auth.uid()
          AND parent.role = 'parent'
        )
      )
    )
  );

CREATE POLICY "Users can insert subscriptions for their family" ON calendar_subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = calendar_subscriptions.family_member_id
      AND (
        -- User is the member
        fm.user_id = auth.uid()
        OR
        -- User is a parent in the same family
        EXISTS (
          SELECT 1 FROM family_members parent
          WHERE parent.family_id = fm.family_id
          AND parent.user_id = auth.uid()
          AND parent.role = 'parent'
        )
      )
    )
  );

CREATE POLICY "Users can delete subscriptions for their family" ON calendar_subscriptions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = calendar_subscriptions.family_member_id
      AND (
        -- User is the member
        fm.user_id = auth.uid()
        OR
        -- User is a parent in the same family
        EXISTS (
          SELECT 1 FROM family_members parent
          WHERE parent.family_id = fm.family_id
          AND parent.user_id = auth.uid()
          AND parent.role = 'parent'
        )
      )
    )
  );
