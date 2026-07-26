import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function deleteForumTables() {
  console.log('[Migration Script] Initializing permanent deletion of forum tables...');

  const externalDbUrl = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL;

  if (!externalDbUrl) {
    console.error('[Migration Script] ERROR: EXTERNAL_DATABASE_URL or DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  const ssl = process.env.NODE_ENV === 'production' && process.env.DB_SSL_REQUIRED !== 'false'
    ? { rejectUnauthorized: false }
    : undefined;

  const pool = new Pool({
    connectionString: externalDbUrl,
    ssl,
    connectionTimeoutMillis: 10000,
  });

  const tablesToDrop = [
    'forum_post_ratings',
    'forum_comments',
    'forum_posts',
    'forum_categories',
  ];

  let client;
  try {
    client = await pool.connect();
    const redactedUrl = externalDbUrl.replace(/:[^:@]+@/, ':****@');
    console.log(`[Migration Script] Successfully connected to database: ${redactedUrl}`);

    await client.query('BEGIN');

    for (const table of tablesToDrop) {
      console.log(`[Migration Script] Dropping table "${table}" if exists (CASCADE)...`);
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
    }

    await client.query('COMMIT');
    console.log('[Migration Script] SUCCESS: All forum tables ("forum_posts", "forum_comments", "forum_categories", "forum_post_ratings") have been permanently deleted from platform_external.');
  } catch (error: any) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rErr) {}
    }
    console.error('[Migration Script] ERROR dropping forum tables:', error.message);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

deleteForumTables();
