-- Default categories table
-- Run this in Supabase SQL editor to manage default categories

CREATE TABLE IF NOT EXISTS default_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow public read of default categories
ALTER TABLE default_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view default categories"
  ON default_categories FOR SELECT
  USING (true);

-- Seed the two default categories (safe to run multiple times)
INSERT INTO default_categories (slug, name, sort_order)
VALUES
  ('odjeca', 'Odjeća', 1),
  ('obuca', 'Obuća', 2)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE;

