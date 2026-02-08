-- Remove hardcoded CHECK constraints for lookup fields
-- Run this after creating default lookup tables

ALTER TABLE items DROP CONSTRAINT IF EXISTS items_category_check;
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_condition_check;
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_material_check;

