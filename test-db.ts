import { ledgerPool } from './server/db/index';
async function test() {
  try {
    const res = await ledgerPool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'withdrawal_requests'`);
    console.log("COLUMNS:", res.rows.map(r => r.column_name));
    process.exit(0);
  } catch (err) {
    console.error("DB ERROR", err);
    process.exit(1);
  }
}
test();
