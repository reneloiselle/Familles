-- Add columns to schedules table for iCal sync (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedules' AND column_name='subscription_id') THEN
        ALTER TABLE schedules ADD COLUMN subscription_id UUID REFERENCES calendar_subscriptions(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedules' AND column_name='external_uid') THEN
        ALTER TABLE schedules ADD COLUMN external_uid TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedules' AND column_name='last_synced_at') THEN
        ALTER TABLE schedules ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedules' AND column_name='created_by') THEN
        ALTER TABLE schedules ADD COLUMN created_by UUID;
    END IF;
END $$;

-- Add unique constraint for upsert operations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'schedules_subscription_external_uid_key'
    ) THEN
        ALTER TABLE schedules 
        ADD CONSTRAINT schedules_subscription_external_uid_key 
        UNIQUE (subscription_id, external_uid);
    END IF;
END $$;

-- Add last_synced_at to calendar_subscriptions (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calendar_subscriptions' AND column_name='last_synced_at') THEN
        ALTER TABLE calendar_subscriptions ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
