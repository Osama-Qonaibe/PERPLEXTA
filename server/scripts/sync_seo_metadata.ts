import { pool, initializePerplextaPools, synchronizePerplextaPoolsFromRegistry } from '../db/index.js';
import { syncAllContentSeoMetadata } from '../services/seoSync.js';

async function main() {
  console.log('[Script] Initializing database pools...');
  await initializePerplextaPools(
    process.env.DATABASE_URL || '',
    process.env.LEDGER_DATABASE_URL || '',
    process.env.EXTERNAL_DATABASE_URL || '',
    process.env.SECURITY_DATABASE_URL || ''
  );
  await synchronizePerplextaPoolsFromRegistry().catch((e) => {
    console.warn('[Script] Registry sync warning:', e.message || e);
  });

  if (!pool) {
    console.error('[Script] ⚠️ Database pool is not active (Operating in Degraded / Offline mode).');
    process.exit(0);
  }

  console.log('[Script] Running SEO metadata sync for blog posts and marketplace items...');
  const result = await syncAllContentSeoMetadata();

  console.log('[Script] Summary Result:', JSON.stringify(result, null, 2));
  console.log('[Script] ✅ SEO metadata sync finished successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Script] ❌ Unhandled error during SEO metadata sync:', err);
  process.exit(1);
});
