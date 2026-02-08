-- Sales table migration
-- Run this in Supabase SQL editor to create sales table for tracking sold items

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Item information captured at time of sale
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  size TEXT,
  price DECIMAL(10,2) NOT NULL,
  condition TEXT NOT NULL,
  
  -- Sale timestamp
  sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by user and date
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON sales(user_id, sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_category ON sales(category);

-- RLS policies
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own sales" ON sales;
DROP POLICY IF EXISTS "Users can insert own sales" ON sales;

CREATE POLICY "Users can view own sales"
  ON sales FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sales"
  ON sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Note: No update or delete policies - sales records should be immutable

