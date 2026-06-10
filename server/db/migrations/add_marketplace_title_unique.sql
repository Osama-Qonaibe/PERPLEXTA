-- Migration: Add unique constraint on marketplace_items.title_en
-- Required for seed_marketplace.ts ON CONFLICT DO NOTHING to work
-- Run once on the database

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'marketplace_items_title_en_key'
  ) THEN
    ALTER TABLE marketplace_items ADD CONSTRAINT marketplace_items_title_en_key UNIQUE (title_en);
    RAISE NOTICE 'Unique constraint on title_en added.';
  ELSE
    RAISE NOTICE 'Unique constraint already exists, skipping.';
  END IF;
END
$$;
