import { ledgerPool } from './server/db/index.js';
async function test() {
  try {
    const res = await ledgerPool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'withdrawal_requests'`);
    console.log(res.rows.map(r => r.column_name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
