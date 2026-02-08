-- Custom Categories table
-- Run this in Supabase SQL editor to enable custom categories

CREATE TABLE IF NOT EXISTS custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique category names per user
  UNIQUE(user_id, slug)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_categories_user ON custom_categories(user_id);

-- RLS policies
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom categories"
  ON custom_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom categories"
  ON custom_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom categories"
  ON custom_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom categories"
  ON custom_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Note: You'll also need to update the items table to remove the CHECK constraint
-- on category if you want to allow custom categories in items:
-- ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_check;

