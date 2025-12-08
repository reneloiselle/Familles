-- Add priority field to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));

-- Create index for better performance when filtering by priority
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

