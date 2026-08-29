import { pool, getSecurityPool } from '../index.js';
import { tableExists } from './helpers.js';

let io: { emit: (event: string, data: Record<string, unknown>) => void } | null = null;

export function setIo(socketIo: { emit: (event: string, data: Record<string, unknown>) => void }) {
  io = socketIo;
}

export function getIo() {
  return io;
}

export async function runSystemMaintenance() {
  try {
    if (!pool) return;
    const maintenanceTasks = [
      {
        name: 'token_blacklist',
        query: "DELETE FROM token_blacklist WHERE expires_at < NOW() AT TIME ZONE 'UTC'",
        pool: getSecurityPool() || pool
      },
      {
        name: 'password_resets',
        query: "DELETE FROM password_resets WHERE expires_at < NOW() AT TIME ZONE 'UTC'"
      },
      {
        name: 'subscriptions',
        query: `
          UPDATE subscriptions 
          SET status = 'expired', updated_at = NOW() AT TIME ZONE 'UTC' 
          WHERE current_period_end < NOW() AT TIME ZONE 'UTC' 
          AND status = 'active'
        `
      },
      {
        name: 'oauth_states',
        query: "DELETE FROM oauth_states WHERE expires_at < NOW() AT TIME ZONE 'UTC'"
      },
      {
        name: 'notifications_read_old',
        query: "DELETE FROM notifications WHERE is_read = true AND created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '30 days'"
      },
      {
        name: 'notifications_unread_old',
        query: "DELETE FROM notifications WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '90 days'"
      },
      {
        name: 'system_logs',
        query: "DELETE FROM system_logs WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '30 days'"
      },
      {
        name: 'stripe_events',
        query: "DELETE FROM stripe_events WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '90 days'"
      },
      {
        name: 'security_alerts',
        query: "DELETE FROM security_alerts WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '90 days'"
      },
      {
        name: 'user_usage',
        query: "DELETE FROM user_usage WHERE usage_date < CURRENT_DATE - INTERVAL '90 days'"
      },
      {
        name: 'user_activity_logs',
        query: "DELETE FROM user_activity_logs WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '30 days'"
      }
    ];

    const secPool = getSecurityPool();
    if (secPool) {
      const exists = await tableExists(secPool, 'admin_audit_logs');
      if (exists) {
        maintenanceTasks.push({
          name: 'admin_audit_logs',
          query: "DELETE FROM admin_audit_logs WHERE created_at < NOW() AT TIME ZONE 'UTC' - INTERVAL '180 days'",
          pool: secPool
        });
      }
    }

    const results = await Promise.allSettled(
      maintenanceTasks.map(async (task) => {
        const targetPool = task.pool || pool;
        if (!targetPool) return { task: task.name, status: 'skipped', reason: 'No pool' };
        try {
          await targetPool.query(task.query);
          return { task: task.name, status: 'success' };
        } catch (error) {
          return {
            task: task.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'failed'));
    if (failed.length > 0) {
      console.warn(`[Maintenance] ${failed.length} tasks failed`);
    } else {
      console.log('[Maintenance] All maintenance tasks completed successfully.');
    }
  } catch (error) {
    console.error('[Maintenance] System maintenance failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}
