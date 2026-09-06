import dotenv from 'dotenv';
dotenv.config();

import { pool, initializePerplextaPools, synchronizePerplextaPoolsFromRegistry } from '../db/index.js';
import { runDatabaseMigrations, verifySchemaIntegrity } from '../db/migrations.js';
import { syncSystemTemplates } from '../services/email.js';
import { refreshCachedAppName } from '../services/system.js';
import { ensureAdsSeedData } from '../routes/ads.js';
import { ensureBulletinSeedData } from '../routes/bulletin.js';

async function resetAndReinitDatabases() {
  console.log('================================================================');
  console.log('[PERPLEXTA DB RESET] Starting Full Multi-Database Reset from Scratch...');
  console.log('================================================================');

  const coreUrl = process.env.DATABASE_URL || '';
  const ledgerUrl = process.env.LEDGER_DATABASE_URL || coreUrl;
  const externalUrl = process.env.EXTERNAL_DATABASE_URL || coreUrl;
  const securityUrl = process.env.SECURITY_DATABASE_URL || coreUrl;

  console.log('[DB Reset] Initializing connections for Core, Ledger, External, and Security databases...');
  await initializePerplextaPools(coreUrl, ledgerUrl, externalUrl, securityUrl);
  await synchronizePerplextaPoolsFromRegistry().catch((err) => {
    console.warn('[DB Reset] Registry sync warning:', err?.message || err);
  });

  if (!pool) {
    console.error('[DB Reset] ❌ Critical: Database pool could not be established. Aborting reset.');
    process.exit(1);
  }

  console.log('\n[DB Reset] 💥 Wiping databases and executing Scratch Migration Suite...');
  console.log('[DB Reset] Running runDatabaseMigrations("all", "scratch")...');
  
  const migrationResult = await runDatabaseMigrations('all', 'scratch');
  
  if (!migrationResult || !migrationResult.success) {
    console.error('[DB Reset] ❌ Migration scratch execution failed:', migrationResult);
    process.exit(1);
  }

  console.log('\n[DB Reset] ✅ Database tables wiped and re-created from scratch.');
  console.log(`[DB Reset] Total versioned migrations executed: ${migrationResult.totalMigrations}`);

  console.log('\n[DB Reset] 🚀 Populating Initial Seed Data & System Data...');
  try {
    await syncSystemTemplates();
    console.log('[DB Reset] ✓ Email system templates synchronized.');
  } catch (e: any) {
    console.warn('[DB Reset] Notice on email templates sync:', e?.message || e);
  }

  try {
    await refreshCachedAppName();
    console.log('[DB Reset] ✓ System name cache refreshed.');
  } catch (e: any) {
    console.warn('[DB Reset] Notice on app name refresh:', e?.message || e);
  }

  try {
    await ensureAdsSeedData();
    console.log('[DB Reset] ✓ Ads system seed data ensured.');
  } catch (e: any) {
    console.warn('[DB Reset] Notice on ads seed:', e?.message || e);
  }

  try {
    await ensureBulletinSeedData();
    console.log('[DB Reset] ✓ Bulletin board seed data ensured.');
  } catch (e: any) {
    console.warn('[DB Reset] Notice on bulletin seed:', e?.message || e);
  }

  console.log('\n[DB Reset] 🔍 Performing final schema integrity verification...');
  await verifySchemaIntegrity();

  console.log('\n================================================================');
  console.log('[PERPLEXTA DB RESET] 🎉 ALL DATABASES & TABLES RE-INITIALIZED SUCCESSFULLY FROM SCRATCH!');
  console.log('================================================================');

  process.exit(0);
}

resetAndReinitDatabases().catch((err) => {
  console.error('[DB Reset] ❌ FATAL ERROR during database reset:', err);
  process.exit(1);
});
