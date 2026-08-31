import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.LEDGER_DATABASE_URL });
async function test() {
  try {
    await client.connect();
    // Use an existing user_id or a fake one for testing. We'll just rollback to not mess up data.
    await client.query('BEGIN');
    const res = await client.query('INSERT INTO withdrawal_requests (user_id, amount_cents, method, details, status) VALUES (1, 1000, \'paypal\', \'test@paypal.com\', \'pending\') RETURNING id');
    console.log('Inserted ID:', res.rows[0].id);
    await client.query('ROLLBACK');
    console.log('Success');
  } catch (err) {
    console.error('Insert Error:', err);
    await client.query('ROLLBACK');
  } finally {
    await client.end();
  }
}
test();
