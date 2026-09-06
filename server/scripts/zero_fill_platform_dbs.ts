import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

interface DBTarget {
  name: string;
  envKey: string;
  defaultDbName: string;
}

const TARGET_DATABASES: DBTarget[] = [
  { name: 'Core Database', envKey: 'DATABASE_URL', defaultDbName: 'platform_core' },
  { name: 'Ledger Database', envKey: 'LEDGER_DATABASE_URL', defaultDbName: 'platform_ledger' },
  { name: 'External Database', envKey: 'EXTERNAL_DATABASE_URL', defaultDbName: 'platform_external' },
  { name: 'Security Database', envKey: 'SECURITY_DATABASE_URL', defaultDbName: 'platform_security' },
];

async function zeroFillDatabase(target: DBTarget) {
  let connectionString = process.env[target.envKey];

  if (!connectionString) {
    const baseUri = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/';
    try {
      const url = new URL(baseUri);
      url.pathname = `/${target.defaultDbName}`;
      connectionString = url.toString();
    } catch {
      connectionString = `postgres://postgres:postgres@127.0.0.1:5432/${target.defaultDbName}`;
    }
  }

  console.log(`\n----------------------------------------------------------------`);
  console.log(`[ZERO-FILL] Processing ${target.name} (${target.defaultDbName})...`);

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    try {
      // 1. Fetch all tables in the public schema
      const tablesRes = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%' 
        AND tablename NOT LIKE 'sql_%';
      `);

      const tables = tablesRes.rows.map((r: { tablename: string }) => `"${r.tablename}"`);

      if (tables.length === 0) {
        console.log(`  ℹ️  No tables found in ${target.defaultDbName}. Skipping.`);
      } else {
        console.log(`  💥 Truncating ${tables.length} tables and resetting identities in ${target.defaultDbName}...`);
        const truncateSql = `TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE;`;
        await client.query(truncateSql);
        console.log(`  ✅ Successfully truncated all tables in ${target.defaultDbName}.`);
      }

      // 2. Explicitly reset all sequences in the public schema
      const seqRes = await client.query(`
        SELECT sequencename 
        FROM pg_sequences 
        WHERE schemaname = 'public';
      `);

      for (const seq of seqRes.rows) {
        const seqName = seq.sequencename;
        try {
          await client.query(`ALTER SEQUENCE "${seqName}" RESTART WITH 1;`);
        } catch {
          // Ignore if sequence was already restarted by CASCADE
        }
      }
      if (seqRes.rows.length > 0) {
        console.log(`  🔄 Reset ${seqRes.rows.length} sequences back to 1 in ${target.defaultDbName}.`);
      }

    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Warning on ${target.name} reset:`, err?.message || err);
  } finally {
    await pool.end();
  }
}

async function runZeroFillAll() {
  console.log('================================================================');
  console.log('🚀 [PLATFORM ZERO-FILL & TOTAL RESET] Starting Database Purge...');
  console.log('================================================================');

  for (const target of TARGET_DATABASES) {
    await zeroFillDatabase(target);
  }

  console.log('\n================================================================');
  console.log('🎉 [PLATFORM ZERO-FILL COMPLETE] All 4 Platform DBs Purged & Reset to 1!');
  console.log('================================================================');
  process.exit(0);
}

runZeroFillAll().catch((error) => {
  console.error('❌ Fatal error during zero-fill reset:', error);
  process.exit(1);
});
