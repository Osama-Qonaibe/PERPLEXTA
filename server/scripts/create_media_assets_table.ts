import { pool, externalPool } from '../db/index.js';

/**
 * Standalone Migration Script:
 * Creates the 'media_assets' table with full schema, context constraints,
 * and foreign key reference columns for users, blog_articles, and marketplace_items.
 */
async function runMediaAssetsMigration() {
  if (!pool) {
    console.error('[Migration: media_assets] Core database pool is not initialized.');
    process.exit(1);
  }

  console.log('[Migration: media_assets] Starting media_assets schema migration...');

  try {
    // 1. Create media_assets table
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
    await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS blog_article_id INTEGER`);
    await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS marketplace_item_id INTEGER REFERENCES marketplace_items(id) ON DELETE SET NULL`);
    await pool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`);
    console.log('[Migration: media_assets] ✅ Foreign key association columns on media_assets verified.');

    // 4. Add foreign key column on users table
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL`);
    console.log('[Migration: media_assets] ✅ avatar_asset_id column and foreign key on users verified.');

    // 5. Add foreign key column on marketplace_items table
    await pool.query(`ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS image_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL`);
    console.log('[Migration: media_assets] ✅ image_asset_id column and foreign key on marketplace_items verified.');

    // 6. Add reference column on blog_articles table (core / external pool)
    const extTarget = externalPool || pool;
    await extTarget.query(`ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS image_asset_id UUID`);
    try {
      await extTarget.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_blog_articles_image_asset'
          ) THEN
            ALTER TABLE blog_articles
            ADD CONSTRAINT fk_blog_articles_image_asset
            FOREIGN KEY (image_asset_id)
            REFERENCES media_assets(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      `);
    } catch (e: any) {
      console.log('[Migration: media_assets] Note: blog_articles FK reference constraint skipped if cross-database:', e.message);
    }
    console.log('[Migration: media_assets] ✅ image_asset_id column and constraint on blog_articles verified.');

    // 7. Ensure performance indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_context ON media_assets(context)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets(sha256_hash)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_stored_path ON media_assets(stored_path)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_media_assets_marketplace_item_id ON media_assets(marketplace_item_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_avatar_asset_id ON users(avatar_asset_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_marketplace_items_image_asset_id ON marketplace_items(image_asset_id)`);
    await extTarget.query(`CREATE INDEX IF NOT EXISTS idx_blog_articles_image_asset_id ON blog_articles(image_asset_id)`);
    console.log('[Migration: media_assets] ✅ Indexes on media_assets and related foreign keys created.');

    console.log('[Migration: media_assets] 🎉 All media_assets migration steps completed successfully.');
    process.exit(0);
  } catch (error: any) {
    console.error('[Migration: media_assets] ❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMediaAssetsMigration();
