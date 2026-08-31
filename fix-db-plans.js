import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function fix() {
  try {
    await client.connect();
    await client.query("ALTER TABLE plans ADD COLUMN IF NOT EXISTS hide_tools BOOLEAN DEFAULT false;");
    console.log("Success Alter");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
fix();
