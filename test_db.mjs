import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query('SELECT logo_url FROM system_settings LIMIT 1');
  if (res.rows.length > 0) {
    const url = res.rows[0].logo_url;
    if (url) {
      console.log('Logo URL length:', url.length);
      console.log('Logo URL starts with:', url.substring(0, 50));
    } else {
      console.log('Logo URL is null or empty');
    }
  } else {
    console.log('No settings found');
  }
  pool.end();
}
run();
