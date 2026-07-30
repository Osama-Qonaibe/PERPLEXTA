import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { initializePerplextaPools, pool } from '../db/index.js';
import { auditFilePipeline } from '../services/fileValidationService.js';

async function main() {
  console.log('==================================================');
  console.log('[Diagnostic Script] Starting user_files & uploads integrity audit...');
  console.log('==================================================');

  try {
    await initializePerplextaPools(
      process.env.DATABASE_URL || '',
      process.env.LEDGER_DATABASE_URL || '',
      process.env.EXTERNAL_DATABASE_URL || '',
      process.env.SECURITY_DATABASE_URL || ''
    );
  } catch (err: any) {
    console.error('[Diagnostic Script] ❌ Failed to initialize database pools:', err.message);
    process.exit(1);
  }

  if (!pool) {
    console.error('[Diagnostic Script] ❌ Database pool is not initialized.');
    process.exit(1);
  }

  try {
    const report = await auditFilePipeline();

    console.log('\n--- AUDIT SUMMARY REPORT ---');
    console.log(`Timestamp           : ${report.timestamp}`);
    console.log(`Total DB Records    : ${report.totalDbRecords}`);
    console.log(`Total Disk Files    : ${report.totalDiskFiles}`);
    console.log(`Discrepancies Found : ${report.discrepanciesCount}`);
    console.log(`Pipeline Status     : ${report.status}`);

    if (report.discrepancies.length > 0) {
      console.log('\n--- DETECTED DISCREPANCIES / ORPHANS ---');
      report.discrepancies.forEach((d, idx) => {
        console.log(`[${idx + 1}] Type: ${d.type}`);
        console.log(`    URL/Path : ${d.file_url}`);
        console.log(`    Details  : ${d.details}`);
        if (d.dbSize !== undefined && d.diskSize !== undefined) {
          console.log(`    Size Diff: DB=${d.dbSize} bytes, Disk=${d.diskSize} bytes`);
        }
        console.log('');
      });
    } else {
      console.log('\n[Diagnostic Script] ✅ All file records and disk assets are 100% verified and synchronized with zero orphans or missing files.');
    }

    console.log('==================================================');
    console.log('[Diagnostic Script] Audit completed successfully.');
    console.log('==================================================');
    process.exit(0);
  } catch (err: any) {
    console.error('[Diagnostic Script] ❌ Fatal error during file integrity audit:', err.message || err);
    process.exit(1);
  }
}

main();
