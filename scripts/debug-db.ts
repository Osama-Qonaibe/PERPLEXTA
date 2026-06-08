import { pool } from '../server/db/index.js';

async function test() {
  try {
    const res = await pool.query('SELECT * FROM tool_orchestrator WHERE tool_id = $1', ['image']);
    console.log('IMAGE ROW:', res.rows[0]);
    const activeKeys = await pool.query('SELECT provider, is_active, LEFT(encrypted_key, 20) as key_prefix FROM api_keys_vault');
    console.log('ACTIVE KEYS IN VAULT:', activeKeys.rows);
  } catch (err: any) {
    console.error('ERROR RUNNING DB DEBUG:', err.message);
  } finally {
    process.exit(0);
  }
}

test();
