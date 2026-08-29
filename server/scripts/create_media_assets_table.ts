import { pool, externalPool } from '../db/index.js';

/**
 * Standalone Migration Script:
 * Creates the 'media_assets' table with full schema, context constraints,
 * and foreign key reference columns for users and marketplace_items (Core DB),
 * and image_asset_id column for blog_articles (External DB - No cross-DB FK).
 */
async function runMediaAssetsMigration() {
  if (!pool) {
    console.error('[Migration: media_assets] Core database pool is not initialized.');
    process.exit(1);
  }

  console.log('[Migration: media_assets] Starting media_assets schema migration...');

  try {
    // 1. Create media_assets table on Core DB
    await pool.query(`
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
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        blog_article_id INTEGER,
        marketplace_item_id INTEGER REFERENCES marketplace_items(id) ON DELETE SET NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[Migration: media_assets] ✅ media_assets table ensured.');

    // 2. Ensure context value check constraint
    await pool.query(`
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
    `);
    console.log('[Migration: media_assets] ✅ Context check constraint (chk_media_assets_context) ensured.');

    // 3. Ensure columns in media_assets if table already existed previously
    await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS blog_article_id INTEGER`);
    await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS marketplace_item_id INTEGER`);
    await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`);

    // 4. Add columns on Core DB tables
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_asset_id UUID`);
    await pool.query(`ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS image_asset_id UUID`);
    console.log('[Migration: media_assets] ✅ Core DB columns ensured.');

    // 5. Add columns on External DB table
    const extTarget = externalPool || pool;
    await extTarget.query(`ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS image_asset_id UUID`);
    console.log('[Migration: media_assets] ✅ External DB column (blog_articles.image_asset_id) ensured.');

    // 6. Ensure performance indexes (After columns are guaranteed)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_context ON media_assets(context)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets(sha256_hash)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_stored_path ON media_assets(stored_path)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_marketplace_item_id ON media_assets(marketplace_item_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_avatar_asset_id ON users(avatar_asset_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_items_image_asset_id ON marketplace_items(image_asset_id)`);
    await extTarget.query(`CREATE INDEX IF NOT EXISTS idx_blog_articles_image_asset_id ON blog_articles(image_asset_id)`);
    console.log('[Migration: media_assets] ✅ Indexes created.');

    // 7. Ensure Foreign Keys (Only within Core DB - No cross-DB FK)
    await pool.query(`
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
    `);

    await pool.query(`
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
    `);

    console.log('[Migration: media_assets] ✅ Foreign keys ensured.');
    console.log('[Migration: media_assets] 🎉 All media_assets migration steps completed successfully.');
    process.exit(0);
  } catch (error: any) {
    console.error('[Migration: media_assets] ❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMediaAssetsMigration();
