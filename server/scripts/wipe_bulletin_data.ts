import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

async function wipeBulletinData() {
  console.log('================================================================');
  console.log('[PERPLEXTA DATA PURGE] Purging Bulletin & Media Data...');
  console.log('================================================================');

  const coreUrl = process.env.DATABASE_URL;
  if (!coreUrl) {
    console.error('❌ DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: coreUrl,
    ssl: coreUrl.includes('localhost') || coreUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
  });

  try {
    const truncateQuery = `
      TRUNCATE TABLE 
        bulletin_ads,
        bulletin_pages,
        bulletin_page_followers,
        bulletin_page_inquiries,
        bulletin_ad_likes,
        bulletin_ad_comments,
        bulletin_comment_likes,
        bulletin_ad_messages,
        bulletin_saved_ads,
        bulletin_reports,
        media_assets
      RESTART IDENTITY CASCADE;
    `;

    console.log('Executing TRUNCATE CASCADE on bulletin and media tables...');
    await pool.query(truncateQuery);
    console.log('✅ Successfully purged all bulletin posts, pages, stories, and orphaned media assets!');
    console.log('================================================================');
  } catch (error: any) {
    console.error('❌ Error executing data purge:', error?.message || error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

wipeBulletinData();
