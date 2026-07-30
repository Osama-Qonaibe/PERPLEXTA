import { pool, externalPool } from '../db/index.js';

async function main() {
  if (!pool) {
    console.error('Core database pool is not initialized.');
    process.exit(1);
  }

  console.log('[Migration Script] Creating indexes on file_url and related media URL columns...');

  const indexes = [
    { table: 'user_files', column: 'file_url', indexName: 'idx_user_files_file_url' },
    { table: 'asset_metadata', column: 'file_url', indexName: 'idx_asset_metadata_file_url' },
    { table: 'bulletin_ads', column: 'image_url', indexName: 'idx_bulletin_ads_image_url' },
    { table: 'bulletin_ads', column: 'video_url', indexName: 'idx_bulletin_ads_video_url' },
    { table: 'bulletin_ads', column: 'author_avatar', indexName: 'idx_bulletin_ads_author_avatar' },
    { table: 'marketplace_items', column: 'image_url', indexName: 'idx_marketplace_items_image_url' },
    { table: 'marketplace_items', column: 'preview_url', indexName: 'idx_marketplace_items_preview_url' },
    { table: 'marketplace_items', column: 'video_url', indexName: 'idx_marketplace_items_video_url' },
    { table: 'marketplace_items', column: 'download_url', indexName: 'idx_marketplace_items_download_url' },
    { table: 'advertisements', column: 'image_url', indexName: 'idx_advertisements_image_url' },
    { table: 'users', column: 'avatar', indexName: 'idx_users_avatar' },
    { table: 'bulletin_pages', column: 'avatar_url', indexName: 'idx_bulletin_pages_avatar_url' },
    { table: 'bulletin_pages', column: 'cover_url', indexName: 'idx_bulletin_pages_cover_url' },
    { table: 'system_settings', column: 'logo_url', indexName: 'idx_system_settings_logo_url' },
    { table: 'system_settings', column: 'logo_light_url', indexName: 'idx_system_settings_logo_light_url' },
    { table: 'system_settings', column: 'seo_image_url', indexName: 'idx_system_settings_seo_image_url' },
    { table: 'system_settings', column: 'favicon_url', indexName: 'idx_system_settings_favicon_url' },
  ];

  for (const { table, column, indexName } of indexes) {
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${column}) WHERE length(${column}) <= 1000`);
      console.log(`[Migration Script] ✅ Index ${indexName} ensured on ${table}(${column}) with length filter <= 1000`);
    } catch (err: any) {
      console.warn(`[Migration Script] ⚠️ Could not create index ${indexName} on ${table}(${column}):`, err.message);
    }
  }

  // Handle external DB targets if present
  const extTarget = externalPool || pool;
  try {
    await extTarget.query(`CREATE INDEX IF NOT EXISTS idx_blog_articles_image_url ON blog_articles(image_url) WHERE length(image_url) <= 1000`);
    console.log(`[Migration Script] ✅ Index idx_blog_articles_image_url ensured on blog_articles(image_url) with length filter <= 1000`);
  } catch (err: any) {
    console.warn(`[Migration Script] ⚠️ Could not create index idx_blog_articles_image_url on blog_articles(image_url):`, err.message);
  }

  console.log('[Migration Script] All file URL indexes migration tasks completed successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Migration Script] Unhandled error during file_url indexes migration:', err);
  process.exit(1);
});
