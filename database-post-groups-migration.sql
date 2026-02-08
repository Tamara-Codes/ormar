-- Post Groups table migration
-- Run this in Supabase SQL editor to create post_groups table for storing group rules

CREATE TABLE IF NOT EXISTS post_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  rules TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique group names per user
  UNIQUE(user_id, name)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_post_groups_user ON post_groups(user_id);

-- RLS policies
ALTER TABLE post_groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own post groups" ON post_groups;
DROP POLICY IF EXISTS "Users can insert own post groups" ON post_groups;
DROP POLICY IF EXISTS "Users can update own post groups" ON post_groups;
DROP POLICY IF EXISTS "Users can delete own post groups" ON post_groups;

CREATE POLICY "Users can view own post groups"
  ON post_groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own post groups"
  ON post_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own post groups"
  ON post_groups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own post groups"
  ON post_groups FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_post_groups_updated_at BEFORE UPDATE ON post_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

