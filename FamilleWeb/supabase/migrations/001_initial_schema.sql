-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create families table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create family_members table
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

-- Create schedules table
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES family_members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_user_id ON family_members(user_id);
CREATE INDEX idx_schedules_family_member_id ON schedules(family_member_id);
CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_tasks_family_id ON tasks(family_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Enable Row Level Security (RLS)
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for families
CREATE POLICY "Users can view families they are members of"
  ON families FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members
      WHERE family_members.family_id = families.id
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create families"
  ON families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update families they created"
  ON families FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete families they created"
  ON families FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for family_members
CREATE POLICY "Users can view family members of their families"
  ON family_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can add members to their families"
  ON family_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'parent'
    )
  );

CREATE POLICY "Parents can update members of their families"
  ON family_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'parent'
    )
  );

CREATE POLICY "Parents can delete members from their families"
  ON family_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'parent'
    )
  );

-- RLS Policies for schedules
CREATE POLICY "Users can view schedules of their family members"
  ON schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = schedules.family_member_id
      AND fm.user_id IN (
        SELECT user_id FROM family_members
        WHERE family_id = (
          SELECT family_id FROM family_members
          WHERE id = schedules.family_member_id
        )
        AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create schedules for themselves"
  ON schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = schedules.family_member_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can create schedules for family members"
  ON schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = schedules.family_member_id
      AND EXISTS (
        SELECT 1 FROM family_members parent
        WHERE parent.family_id = fm.family_id
        AND parent.user_id = auth.uid()
        AND parent.role = 'parent'
      )
    )
  );

CREATE POLICY "Users can update their own schedules"
  ON schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = schedules.family_member_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can update schedules of family members"
  ON schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = schedules.family_member_id
      AND EXISTS (
        SELECT 1 FROM family_members parent
        WHERE parent.family_id = fm.family_id
        AND parent.user_id = auth.uid()
        AND parent.role = 'parent'
      )
    )
  );

CREATE POLICY "Users can delete their own schedules"
  ON schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = schedules.family_member_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can delete schedules of family members"
  ON schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.id = schedules.family_member_id
      AND EXISTS (
        SELECT 1 FROM family_members parent
        WHERE parent.family_id = fm.family_id
        AND parent.user_id = auth.uid()
        AND parent.role = 'parent'
      )
    )
  );

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks of their families"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = tasks.family_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = tasks.family_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their families"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = tasks.family_id
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks they created"
  ON tasks FOR DELETE
  USING (auth.uid() = created_by);

