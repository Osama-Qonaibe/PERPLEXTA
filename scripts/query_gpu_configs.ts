import dotenv from 'dotenv';
dotenv.config();

import { pool, initializePerplextaPools } from '../server/db/index';

async function main() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('DATABASE_URL environment variable is missing.');
      process.exit(1);
    }
    await initializePerplextaPools(dbUrl, process.env.LEDGER_DATABASE_URL || dbUrl);

    // Get last 5 video jobs with full parameters
    const result = await pool.query(`
      SELECT id, status, prompt, parameters, result_url, error_message, created_at, result_data
      FROM gpu_execution_jobs 
      WHERE task_type = 'video_gen' 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    console.log('--- Last 3 Video Generation Jobs Detailed ---');
    for (const r of result.rows) {
      console.log(`\n===================================`);
      console.log(`Job ID: ${r.id}`);
      console.log(`Status: ${r.status}`);
      console.log(`Prompt: ${r.prompt}`);
      console.log(`Parameters:`, JSON.stringify(r.parameters, null, 2));
      console.log(`Result URL: ${r.result_url}`);
      console.log(`Error Message: ${r.error_message}`);
      
      // Print only the keys and structure of result_data to avoid flooding base64
      if (r.result_data) {
        console.log(`Result Data Keys:`, Object.keys(r.result_data));
        if (r.result_data.output) {
          console.log(`Result Data Output Keys:`, Object.keys(r.result_data.output));
          if (typeof r.result_data.output.video === 'string') {
            console.log(`Result Data Output Video Length: ${r.result_data.output.video.length}`);
            console.log(`Result Data Output Video Start: ${r.result_data.output.video.substring(0, 100)}...`);
          } else {
            console.log(`Result Data Output Video:`, JSON.stringify(r.result_data.output.video));
          }
        }
      }
    }
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    process.exit(0);
  }
}

main();
