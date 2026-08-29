const fs = require('fs');
let content = fs.readFileSync('server/db/migrations.ts', 'utf8');

const target = `      // Add foreign key columns on users and marketplace_items
      await tx.query(\`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_asset_id UUID\`);
      await tx.query(\`ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS image_asset_id UUID\`);

      // Ensure foreign key constraints on Core DB
      await tx.query(\`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_avatar_asset_id') THEN
            ALTER TABLE users
            ADD CONSTRAINT fk_users_avatar_asset_id
            FOREIGN KEY (avatar_asset_id)
            REFERENCES media_assets(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      \`);

      await tx.query(\`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_marketplace_items_image_asset_id') THEN
            ALTER TABLE marketplace_items
            ADD CONSTRAINT fk_marketplace_items_image_asset_id
            FOREIGN KEY (image_asset_id)
            REFERENCES media_assets(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      \`);

      await tx.query(\`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_assets_user_id') THEN
            ALTER TABLE media_assets
            ADD CONSTRAINT fk_media_assets_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      \`);

      await tx.query(\`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_assets_marketplace_item_id') THEN
            ALTER TABLE media_assets
            ADD CONSTRAINT fk_media_assets_marketplace_item_id
            FOREIGN KEY (marketplace_item_id)
            REFERENCES marketplace_items(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      \`);

      // Add reference column on blog_articles (External DB pool - cross-pool references tracked at application level)
      const extTarget = externalClient || tx;
      await extTarget.query(\`ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS image_asset_id UUID\`);

      // Performance indexes
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_media_assets_context ON media_assets(context)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets(sha256_hash)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_media_assets_stored_path ON media_assets(stored_path)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_media_assets_marketplace_item_id ON media_assets(marketplace_item_id)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_users_avatar_asset_id ON users(avatar_asset_id)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_marketplace_items_image_asset_id ON marketplace_items(image_asset_id)\`);
      await extTarget.query(\`CREATE INDEX IF NOT EXISTS idx_blog_articles_image_asset_id ON blog_articles(image_asset_id)\`);`;

const replacement = `      // === Core DB Columns ===
      await tx.query(\`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_asset_id UUID\`);
      await tx.query(\`ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS image_asset_id UUID\`);

      // === External DB Columns ===
      const extTarget = externalClient || tx;
      await extTarget.query(\`ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS image_asset_id UUID\`);

      // === Indexes (After columns are guaranteed) ===
      
      // Core Indexes
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_media_assets_context ON media_assets(context)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets(sha256_hash)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_media_assets_stored_path ON media_assets(stored_path)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_media_assets_marketplace_item_id ON media_assets(marketplace_item_id)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_users_avatar_asset_id ON users(avatar_asset_id)\`);
      await tx.query(\`CREATE INDEX IF NOT EXISTS idx_marketplace_items_image_asset_id ON marketplace_items(image_asset_id)\`);

      // External Indexes
      await extTarget.query(\`CREATE INDEX IF NOT EXISTS idx_blog_articles_image_asset_id ON blog_articles(image_asset_id)\`);

      // === Foreign Keys (Only within the same database) ===
      
      await tx.query(\`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_avatar_asset_id') THEN
            ALTER TABLE users
            ADD CONSTRAINT fk_users_avatar_asset_id
            FOREIGN KEY (avatar_asset_id)
            REFERENCES media_assets(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      \`);

      await tx.query(\`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_marketplace_items_image_asset_id') THEN
            ALTER TABLE marketplace_items
            ADD CONSTRAINT fk_marketplace_items_image_asset_id
            FOREIGN KEY (image_asset_id)
            REFERENCES media_assets(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      \`);

      await tx.query(\`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_assets_user_id') THEN
            ALTER TABLE media_assets
            ADD CONSTRAINT fk_media_assets_user_id
            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      \`);

      await tx.query(\`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_media_assets_marketplace_item_id') THEN
            ALTER TABLE media_assets
            ADD CONSTRAINT fk_media_assets_marketplace_item_id
            FOREIGN KEY (marketplace_item_id)
            REFERENCES marketplace_items(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      \`);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('server/db/migrations.ts', content, 'utf8');
    console.log("Successfully replaced block in migrations.ts");
} else {
    console.log("Target not found! Please check spacing/lines.");
}
