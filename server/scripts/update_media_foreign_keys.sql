-- Migration: Add Columns and Same-Database Foreign Keys for 'media_assets' Table
-- Core Database: 'media_assets', 'users', 'marketplace_items'
-- External Database: 'blog_articles' (No cross-database foreign keys)
-- Rule: Ensure ON DELETE SET NULL behavior on image foreign keys within Core DB

-- === 1. CORE DB: Ensure 'media_assets' Table Exists ===
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stored_path TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT 'general',
  format TEXT NOT NULL DEFAULT 'webp',
  width INT NOT NULL DEFAULT 0,
  height INT NOT NULL DEFAULT 0,
  size_bytes INT NOT NULL DEFAULT 0,
  sha256_hash TEXT NOT NULL UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  user_id INTEGER,
  blog_article_id INTEGER,
  marketplace_item_id INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure context check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_media_assets_context'
  ) THEN
    ALTER TABLE media_assets 
    ADD CONSTRAINT chk_media_assets_context 
    CHECK (context IN ('avatar', 'blog', 'marketplace', 'bulletin', 'ad', 'system', 'general'));
  END IF;
END $$;

-- === 2. CORE DB: Add Columns First ===
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_asset_id UUID;
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS image_asset_id UUID;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS blog_article_id INTEGER;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS marketplace_item_id INTEGER;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- === 3. EXTERNAL DB: Add Column on blog_articles ===
-- (Executed on External DB connection - no foreign key to Core DB)
-- ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS image_asset_id UUID;
-- CREATE INDEX IF NOT EXISTS idx_blog_articles_image_asset_id ON blog_articles(image_asset_id);

-- === 4. CORE DB: Indexes (After columns are guaranteed) ===
CREATE INDEX IF NOT EXISTS idx_users_avatar_asset_id ON users(avatar_asset_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_image_asset_id ON marketplace_items(image_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_marketplace_item_id ON media_assets(marketplace_item_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_context ON media_assets(context);
CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_media_assets_stored_path ON media_assets(stored_path);

-- === 5. CORE DB: Intra-Database Foreign Keys ===
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_avatar_asset_id'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT fk_users_avatar_asset_id
    FOREIGN KEY (avatar_asset_id)
    REFERENCES media_assets(id)
    ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_marketplace_items_image_asset_id'
  ) THEN
    ALTER TABLE marketplace_items
    ADD CONSTRAINT fk_marketplace_items_image_asset_id
    FOREIGN KEY (image_asset_id)
    REFERENCES media_assets(id)
    ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_assets_user_id'
  ) THEN
    ALTER TABLE media_assets
    ADD CONSTRAINT fk_media_assets_user_id
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_assets_marketplace_item_id'
  ) THEN
    ALTER TABLE media_assets
    ADD CONSTRAINT fk_media_assets_marketplace_item_id
    FOREIGN KEY (marketplace_item_id)
    REFERENCES marketplace_items(id)
    ON DELETE SET NULL;
  END IF;
END $$;
