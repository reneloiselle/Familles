-- Fix RLS policy for schedules to allow viewing schedules of all family members
-- including members without accounts

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view schedules of their family members" ON schedules;

-- Create new SELECT policy that allows viewing all schedules in the family
-- This works for both members with accounts and without accounts
CREATE POLICY "Users can view schedules of their family members"
  ON schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM family_members fm_schedule
      WHERE fm_schedule.id = schedules.family_member_id
      AND EXISTS (
        SELECT 1 
        FROM family_members fm_user
        WHERE fm_user.family_id = fm_schedule.family_id
        AND fm_user.user_id = auth.uid()
      )
    )
  );

