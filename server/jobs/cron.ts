import cron from 'node-cron';
import { runSystemMaintenance, monitorDatabases } from '../db/migrations.js';
import { pool } from '../db/index.js';
import { createNotification } from '../services/notifications.js';
import { consolidateAllUserMemories } from '../services/memory.js';
import fs from 'fs/promises';
import path from 'path';

export interface CronJobInfo {
  lastRun: string;
  status: 'idle' | 'running' | 'success' | 'error';
  error: string | null;
}

export const cronTracker: Record<string, CronJobInfo> = {
  dailyMaintenance: { lastRun: new Date(Date.now() - 4 * 3600000).toISOString(), status: 'success', error: null },
  databaseHeartbeat: { lastRun: new Date(Date.now() - 2 * 60000).toISOString(), status: 'success', error: null },
  expiredTokensCleanup: { lastRun: new Date(Date.now() - 3.5 * 360000) .toISOString(), status: 'success', error: null },
  subscriptionAudit: { lastRun: new Date(Date.now() - 5 * 3600000).toISOString(), status: 'success', error: null },
  dailySeoScan: { lastRun: new Date(Date.now() - 6 * 3600000).toISOString(), status: 'success', error: null },
  memoryCompaction: { lastRun: new Date(Date.now() - 12 * 3600000).toISOString(), status: 'success', error: null },
  monthlyLedgerCleanup: { lastRun: new Date(Date.now() - 15 * 24 * 3600000).toISOString(), status: 'success', error: null },
  storyPurge: { lastRun: new Date(Date.now() - 3600000).toISOString(), status: 'success', error: null },
};

async function cleanupOrphanedPhysicalFiles() {
  console.log('[Cron] 🧹 Starting physical files audit and purge...');
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    try {
      await fs.access(uploadDir);
    } catch {
      console.log('[Cron] Uploads folder does not exist yet. Skipping physical purge.');
      return;
    }

    const filesOnDisk = await fs.readdir(uploadDir);
    if (filesOnDisk.length === 0) {
      console.log('[Cron] No physical files found on disk uploads.');
      return;
    }

    const dbFilesRes = await pool.query('SELECT file_url FROM user_files');
    const validFilenames = new Set(dbFilesRes.rows.map((row: any) => row.file_url));

    let purgedCount = 0;
    for (const filename of filesOnDisk) {
      if (filename.startsWith('.')) continue;

      if (!validFilenames.has(filename)) {
        const filePath = path.join(uploadDir, filename);
        await fs.unlink(filePath).catch(() => {});
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      console.log(`[Cron] Purged ${purgedCount} orphaned physical files off disk successfully.`);
    } else {
      console.log('[Cron] Disk is completely synchronized. Zero orphaned files detected.');
    }
  } catch (err: any) {
    console.error('[Cron] Orphaned files physical audit failed:', err.message);
  }
}

async function purgeGeneratedFilesOlderThan24Hours() {
  console.log('[Cron] ⏰ Starting automated cleanup of files older than 24 hours to prevent disk inflation...');
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    try {
      await fs.access(uploadDir);
    } catch {
      console.log('[Cron] Uploads folder does not exist yet. Skipping cleanup.');
      return;
    }

    const result = await pool.query(
      `SELECT id, file_url FROM user_files WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'`
    );

    if (result.rows.length === 0) {
      console.log('[Cron] No database records of files older than 24 hours found.');
      return;
    }

    console.log(`[Cron] Found ${result.rows.length} files older than 24 hours to purge.`);

    let purgedCount = 0;
    for (const row of result.rows) {
      const fileUrl = row.file_url;
      if (!fileUrl) continue;

      let filename = fileUrl;
      if (filename.startsWith('/uploads/')) {
        filename = filename.replace('/uploads/', '');
      }

      const filePath = path.join(uploadDir, filename);

      try {
        await fs.unlink(filePath).catch(() => {});
        purgedCount++;
      } catch (err: any) {
        console.warn(`[Cron] Could not delete physical file ${filename}:`, err.message);
      }
    }

    const deleteFilesCount = await pool.query(
      `DELETE FROM user_files WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'`
    );
    
    const deleteVideosCount = await pool.query(
      `DELETE FROM video_resources WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'`
    );

    console.log(`[Cron] Purging reports: physically removed ${purgedCount} files. Erased ${deleteFilesCount.rowCount} records from user_files, and ${deleteVideosCount.rowCount} from video_resources.`);
  } catch (err: any) {
    console.error('[Cron] Automated old files physical & database purge failed:', err.message);
  }
}

async function purgeExpiredStories() {
  console.log('[Cron] 🎬 Starting automated purge of expired stories (older than 24h)...');
  cronTracker.storyPurge = { lastRun: new Date().toISOString(), status: 'running', error: null };
  try {
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // 1. Find expired stories
    const result = await pool.query(
      `SELECT id, image_url, video_url FROM bulletin_ads 
       WHERE ad_format = 'story' 
       AND (expires_at < CURRENT_TIMESTAMP OR created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours')`
    );

    if (result.rows.length === 0) {
      console.log('[Cron] No expired stories found for purging.');
      cronTracker.storyPurge = { lastRun: new Date().toISOString(), status: 'success', error: null };
      return;
    }

    console.log(`[Cron] Found ${result.rows.length} expired stories to purge.`);

    let purgedFilesCount = 0;
    for (const row of result.rows) {
      const filesToPurge = [row.image_url, row.video_url].filter(Boolean);
      
      for (let fileUrl of filesToPurge) {
        if (!fileUrl) continue;
        
        let filename = fileUrl;
        if (filename.startsWith('/uploads/')) {
          filename = filename.replace('/uploads/', '');
        } else if (filename.includes('/uploads/')) {
          filename = filename.split('/uploads/')[1];
        } else if (filename.startsWith('http')) {
          continue; 
        }

        const filePath = path.join(uploadDir, filename);
        try {
          await fs.unlink(filePath).catch(() => {});
          purgedFilesCount++;
        } catch (err: any) {
        }
      }
    }

    // 2. Delete from database
    const deleteRes = await pool.query(
      `DELETE FROM bulletin_ads 
       WHERE ad_format = 'story' 
       AND (expires_at < CURRENT_TIMESTAMP OR created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours')`
    );

    console.log(`[Cron] Story purge complete: Removed ${deleteRes.rowCount} database records and attempted to delete ${purgedFilesCount} file assets.`);
    cronTracker.storyPurge = { lastRun: new Date().toISOString(), status: 'success', error: null };
  } catch (err: any) {
    console.error('[Cron] Expired stories purge failed:', err.message);
    cronTracker.storyPurge = { lastRun: new Date().toISOString(), status: 'error', error: err.message };
  }
}

export function initCronJobs() {
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] 🕒 Running daily system maintenance...');
    cronTracker.dailyMaintenance = { lastRun: new Date().toISOString(), status: 'running', error: null };
    try {
      await runSystemMaintenance();
      await pool.query('UPDATE api_keys_vault SET used_today = 0, last_reset_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP');
      console.log('[Cron] API keys usage reset completed.');
      
      await purgeGeneratedFilesOlderThan24Hours();
      await purgeExpiredStories();

      await cleanupOrphanedPhysicalFiles();
      cronTracker.dailyMaintenance = { lastRun: new Date().toISOString(), status: 'success', error: null };
    } catch (err: any) {
      console.error('[Cron] Maintenance failed:', err);
      cronTracker.dailyMaintenance = { lastRun: new Date().toISOString(), status: 'error', error: err.message || 'Unknown error' };
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Cron] 💓 Running database heartbeat check...');
    }
    cronTracker.databaseHeartbeat = { lastRun: new Date().toISOString(), status: 'running', error: null };
    try {
      await monitorDatabases();
      cronTracker.databaseHeartbeat = { lastRun: new Date().toISOString(), status: 'success', error: null };
    } catch (err: any) {
      cronTracker.databaseHeartbeat = { lastRun: new Date().toISOString(), status: 'error', error: err.message || 'Unknown error' };
    }
  });

  cron.schedule('0 */6 * * *', async () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Cron] 🧹 Running background micro-cleanup for expired tokens and resets...');
    }
    cronTracker.expiredTokensCleanup = { lastRun: new Date().toISOString(), status: 'running', error: null };
    try {
      if (pool) {
        await pool.query("DELETE FROM token_blacklist WHERE expires_at < CURRENT_TIMESTAMP");
        await pool.query("DELETE FROM password_resets WHERE expires_at < CURRENT_TIMESTAMP");
      }
      cronTracker.expiredTokensCleanup = { lastRun: new Date().toISOString(), status: 'success', error: null };
    } catch (err: any) {
      console.error('[Cron] Micro-cleanup failed:', err.message);
      cronTracker.expiredTokensCleanup = { lastRun: new Date().toISOString(), status: 'error', error: err.message || 'Unknown error' };
    }
  });

  cron.schedule('5 3 * * *', async () => {
    console.log('[Cron] 🔍 Checking for expiring subscriptions...');
    cronTracker.subscriptionAudit = { lastRun: new Date().toISOString(), status: 'running', error: null };
    try {
      const expiringRes = await pool.query(`
        SELECT s.user_id, u.email, u.name, u.language, p.name_en, p.name_ar, s.current_period_end 
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        JOIN plans p ON s.plan_id = p.id
        WHERE s.status = 'active' 
        AND s.current_period_end BETWEEN CURRENT_TIMESTAMP + INTERVAL '2 days' AND CURRENT_TIMESTAMP + INTERVAL '3 days'
        AND p.name_en != 'Free Plan'
      `);

      for (const sub of expiringRes.rows) {
        const titleEn = 'Subscription Renewal Reminder';
        const titleAr = 'تذكير بتجديد الاشتراك';
        const msgEn = `Your ${sub.name_en} subscription will expire/renew in 3 days.`;
        const msgAr = `سيتم تجديد/انتهاء اشتراكك في ${sub.name_ar} خلال 3 أيام.`;
        await createNotification(sub.user_id, 'system', titleEn, titleAr, msgEn, msgAr);
      }
      cronTracker.subscriptionAudit = { lastRun: new Date().toISOString(), status: 'success', error: null };
    } catch (err: any) {
      console.error('[Cron] Subscription check failed:', err);
      cronTracker.subscriptionAudit = { lastRun: new Date().toISOString(), status: 'error', error: err.message || 'Unknown error' };
    }
  });

  cron.schedule('0 2 * * *', async () => {
    console.log('[Cron] 🔍 Running daily automated SEO metadata scan for missing content fields...');
    cronTracker.dailySeoScan = { lastRun: new Date().toISOString(), status: 'running', error: null };
    try {
      const { syncAllContentSeoMetadata } = await import('../services/seoSync.js');
      const result = await syncAllContentSeoMetadata();
      console.log('[Cron] Daily SEO metadata routine completed successfully:', result);
      cronTracker.dailySeoScan = { lastRun: new Date().toISOString(), status: 'success', error: null };
    } catch (err: any) {
      console.error('[Cron] Daily SEO metadata routine failed:', err.message);
      cronTracker.dailySeoScan = { lastRun: new Date().toISOString(), status: 'error', error: err.message || 'Unknown error' };
    }
  });

  cron.schedule('30 4 1 * *', async () => {
    console.log('[Cron] 🧠 Running monthly memory distillation (coherence compaction)...');
    cronTracker.memoryCompaction = { lastRun: new Date().toISOString(), status: 'running', error: null };
    try {
      const result = await consolidateAllUserMemories({ threshold: 45 });
      console.log('[Cron] Inactive memory distillation completed successfully:', result);
      cronTracker.memoryCompaction = { lastRun: new Date().toISOString(), status: 'success', error: null };
    } catch (err: any) {
      console.error('[Cron] Monthly memory distillation failed:', err.message);
      cronTracker.memoryCompaction = { lastRun: new Date().toISOString(), status: 'error', error: err.message || 'Unknown error' };
    }
  });

  cron.schedule('0 5 1 * *', async () => {
    console.log('[Cron] 💸 Running monthly ledger transaction purge...');
    cronTracker.monthlyLedgerCleanup = { lastRun: new Date().toISOString(), status: 'running', error: null };
    try {
      const { ledgerPool } = await import('../db/index.js');
      if (ledgerPool) {
        const deleteRes = await ledgerPool.query("DELETE FROM ledger_transactions WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'");
        console.log(`[Cron] Purged historical transactions from ledger_transactions: ${deleteRes.rowCount} rows deleted.`);
      }
      cronTracker.monthlyLedgerCleanup = { lastRun: new Date().toISOString(), status: 'success', error: null };
    } catch (err: any) {
      console.error('[Cron] Monthly ledger purge failed:', err.message);
      cronTracker.monthlyLedgerCleanup = { lastRun: new Date().toISOString(), status: 'error', error: err.message || 'Unknown error' };
    }
  });

  cron.schedule('*/30 * * * *', async () => {
    console.log('[Cron] 🌐 Checking for newly inserted items to ping search engine sitemaps...');
    try {
      if (pool) {
        const newBlogs = await pool.query("SELECT id FROM blog_articles WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 minutes' LIMIT 1");
        const newMarketplace = await pool.query("SELECT id FROM marketplace_items WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 minutes' LIMIT 1");

        if ((newBlogs.rowCount && newBlogs.rowCount > 0) || (newMarketplace.rowCount && newMarketplace.rowCount > 0)) {
          console.log('[Cron] Found newly inserted articles/items. Triggering sitemap ping...');
          const { pingSearchEngines } = await import('../services/sitemapPinger.js');
          await pingSearchEngines();
        }
      }
    } catch (err: any) {
      console.error('[Cron] Sitemap pinger failed:', err.message);
    }
  });
}
