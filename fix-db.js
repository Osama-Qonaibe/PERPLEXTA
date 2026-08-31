import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.LEDGER_DATABASE_URL });
async function fix() {
  try {
    await client.connect();
    await client.query("ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS amount_cents INTEGER DEFAULT 0;");
    await client.query("ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS method VARCHAR(50);");
    await client.query("ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS details TEXT;");
    await client.query("ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;");
    console.log("Success");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
fix();
