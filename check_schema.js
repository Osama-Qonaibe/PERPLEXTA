
import { pool } from './server/db/index.js';

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tool_orchestrator'
    `);
    console.log('Columns in tool_orchestrator:', res.rows.map(r => r.column_name));
  } catch (e) {
    console.error('Error checking schema:', e);
  } finally {
    process.exit(0);
  }
}

checkSchema();
