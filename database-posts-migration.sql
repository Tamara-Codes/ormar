-- Posts and Publications tables migration
-- Run this in Supabase SQL editor to create/update posts and publications tables

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_ids TEXT[] NOT NULL DEFAULT '{}',
  description TEXT,
  collage_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add description column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'description'
  ) THEN
    ALTER TABLE posts ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add user_id column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    -- Note: If you have existing posts, you'll need to manually update them with user_id
    -- Example: UPDATE posts SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    -- Then uncomment the line below to make it NOT NULL:
    -- ALTER TABLE posts ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Index for listing user's posts
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);

-- RLS policies for posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own posts" ON posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

CREATE POLICY "Users can view own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Publications table
CREATE TABLE IF NOT EXISTS publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  item_ids TEXT[] NOT NULL DEFAULT '{}',
  fb_page_name TEXT NOT NULL,
  description TEXT,
  collage_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add user_id column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'publications' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE publications ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    -- Note: If you have existing publications, you'll need to manually update them with user_id
    -- Example: UPDATE publications SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
    -- Then uncomment the line below to make it NOT NULL:
    -- ALTER TABLE publications ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Index for listing user's publications
CREATE INDEX IF NOT EXISTS idx_publications_user_published ON publications(user_id, published_at DESC);

-- RLS policies for publications
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own publications" ON publications;
DROP POLICY IF EXISTS "Users can insert own publications" ON publications;
DROP POLICY IF EXISTS "Users can update own publications" ON publications;
DROP POLICY IF EXISTS "Users can delete own publications" ON publications;

CREATE POLICY "Users can view own publications"
  ON publications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own publications"
  ON publications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own publications"
  ON publications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own publications"
  ON publications FOR DELETE
  USING (auth.uid() = user_id);

