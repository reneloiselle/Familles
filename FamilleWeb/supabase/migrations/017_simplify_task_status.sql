-- Simplify task status to only 'todo' and 'completed'
-- First, update existing tasks: 'pending' and 'in_progress' -> 'todo', 'completed' stays 'completed'
UPDATE tasks 
SET status = 'todo' 
WHERE status IN ('pending', 'in_progress');

-- Drop the old constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add new constraint with simplified statuses
ALTER TABLE tasks 
ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'completed'));

-- Update default value
ALTER TABLE tasks 
ALTER COLUMN status SET DEFAULT 'todo';

