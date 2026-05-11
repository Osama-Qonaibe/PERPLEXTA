import cron from 'node-cron';
import { runSystemMaintenance } from '../db/migrations.js';
import { pool } from '../db/index.js';
import { createNotification } from '../services/notifications.js';

export function initCronJobs() {
  // Daily maintenance at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] 🕒 Running daily system maintenance...');
    await runSystemMaintenance();
  });

  // Database monitoring every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    // This could also be a separate monitoring service
  });

  // Subscription reminders at 3:05 AM
  cron.schedule('5 3 * * *', async () => {
    console.log('[Cron] 🔍 Checking for expiring subscriptions...');
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
    } catch (err) {
      console.error('[Cron] Subscription check failed:', err);
    }
  });
}
