-- Default conditions and materials tables
-- Run this in Supabase SQL editor to manage these lookup lists

CREATE TABLE IF NOT EXISTS default_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS default_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE default_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view default conditions"
  ON default_conditions FOR SELECT
  USING (true);

CREATE POLICY "Public can view default materials"
  ON default_materials FOR SELECT
  USING (true);

-- Seed conditions
INSERT INTO default_conditions (slug, name, sort_order)
VALUES
  ('novo', 'Novo', 1),
  ('kao_novo', 'Kao novo', 2),
  ('dobro', 'Dobro', 3),
  ('koristeno', 'Korišteno', 4)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE;

-- Seed materials
INSERT INTO default_materials (slug, name, sort_order)
VALUES
  ('pamuk', 'Pamuk', 1),
  ('vuna', 'Vuna', 2),
  ('poliester', 'Poliester', 3),
  ('mješavina', 'Mješavina', 4),
  ('lan', 'Lan', 5),
  ('svila', 'Svila', 6),
  ('koza', 'Koža', 7),
  ('traper', 'Traper', 8),
  ('viskoza', 'Viskoza', 9),
  ('akril', 'Akril', 10),
  ('najlon', 'Najlon', 11),
  ('elastan', 'Elastan', 12)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE;

