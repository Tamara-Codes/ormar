-- Items table
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- AI generated fields
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('odjeca', 'obuca', 'oprema', 'igracke')),
  brand TEXT,
  size TEXT,

  -- Manual fields
  condition TEXT NOT NULL CHECK (condition IN ('novo', 'kao_novo', 'dobro', 'koristeno')),
  material TEXT CHECK (material IN ('pamuk', 'vuna', 'poliester', 'mješavina')),
  color TEXT,

  -- Pricing & status
  price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'sold')),

  -- Photos (array of storage URLs)
  images TEXT[] NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing user's items
CREATE INDEX idx_items_user_created ON items(user_id, created_at DESC);

-- RLS policies
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE
  USING (auth.uid() = user_id);

-- Storage bucket setup - run these in Supabase storage policy editor:
-- 1. Create public bucket 'item-images' in Storage tab
-- 2. Add policy for uploads:
-- CREATE POLICY "Users can upload own images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'item-images' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
