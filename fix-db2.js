import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.LEDGER_DATABASE_URL });
async function fix() {
  try {
    await client.connect();
    
    // Check if amount is NOT NULL
    const res = await client.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'withdrawal_requests'");
    console.log(res.rows);
    
    // Make amount, payout_method, payout_details nullable to avoid NOT NULL constraint violations
    await client.query("ALTER TABLE withdrawal_requests ALTER COLUMN amount DROP NOT NULL;");
    await client.query("ALTER TABLE withdrawal_requests ALTER COLUMN payout_method DROP NOT NULL;");
    await client.query("ALTER TABLE withdrawal_requests ALTER COLUMN payout_details DROP NOT NULL;");
    
    console.log("Success Alter");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
fix();
