-- Add location field to schedules table
ALTER TABLE schedules
ADD COLUMN location TEXT;

-- Add index for location searches (optional, but useful for filtering)
CREATE INDEX IF NOT EXISTS idx_schedules_location ON schedules(location);

