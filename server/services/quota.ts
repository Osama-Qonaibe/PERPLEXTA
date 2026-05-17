import { pool } from '../db/index.js';

export async function checkUserQuota(userId: number, toolId: string) {
  try {
    if (!pool) return { allowed: true };

    const res = await pool.query(`
      WITH user_info AS (
        SELECT 
          u.id as user_id,
          u.role,
          p.limits
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        LEFT JOIN plans p ON (s.plan_id = p.id OR (s.plan_id IS NULL AND p.name_en = 'Starter'))
        WHERE u.id = $1
      ),
      daily_usage AS (
        SELECT COALESCE(usage_count, 0) as count
        FROM user_usage
        WHERE user_id = $1 AND tool_id = $2 AND usage_date = CURRENT_DATE
      ),
      monthly_usage AS (
        SELECT SUM(COALESCE(usage_count, 0)) as count
        FROM user_usage
        WHERE user_id = $1 AND tool_id = $2 AND usage_date >= date_trunc('month', CURRENT_DATE)
      )
      SELECT 
        ui.limits,
        ui.role,
        (SELECT count FROM daily_usage) as daily_count,
        (SELECT count FROM monthly_usage) as monthly_count
      FROM user_info ui
    `, [userId, toolId]);

    if (res.rows.length === 0) return { allowed: true };
    
    const { limits, role, daily_count, monthly_count } = res.rows[0];
    
    if (role === 'admin') return { allowed: true };
    
    const currentDaily = parseInt(daily_count || '0');
    const currentMonthly = parseInt(monthly_count || '0');
    
    if (!limits) return { allowed: true };
    
    const toolLimit = limits[toolId];
    if (!toolLimit || toolLimit === 'unlimited') return { allowed: true };
    
    let dailyLimitVal = typeof toolLimit === 'object' ? toolLimit.daily : toolLimit;
    if (dailyLimitVal && dailyLimitVal !== 'unlimited') {
      const dailyLimit = parseInt(dailyLimitVal);
      if (!isNaN(dailyLimit) && currentDaily >= dailyLimit) {
        return { 
          allowed: false, 
          limit: dailyLimit, 
          currentUsage: currentDaily,
          period: 'daily'
        };
      }
    }

    let monthlyLimitVal = typeof toolLimit === 'object' ? toolLimit.monthly : null;
    if (monthlyLimitVal && monthlyLimitVal !== 'unlimited') {
      const monthlyLimit = parseInt(monthlyLimitVal);
      if (!isNaN(monthlyLimit) && currentMonthly >= monthlyLimit) {
        return { 
          allowed: false, 
          limit: monthlyLimit, 
          currentUsage: currentMonthly,
          period: 'monthly'
        };
      }
    }

    return { allowed: true, currentDaily, currentMonthly };
  } catch (error) {
    // FAIL-OPEN: If database check fails, we allow the usage to prevent blocking users 
    // during infrastructure hiccups. This prioritizes Premium UX over strict billing enforcement.
    console.error('[Quota] Check failed:', error);
    return { allowed: true };
  }
}

export async function incrementUserUsage(userId: number, toolId: string) {
  try {
    await pool.query(`
      INSERT INTO user_usage (user_id, tool_id, usage_count, usage_date)
      VALUES ($1, $2, 1, CURRENT_DATE)
      ON CONFLICT (user_id, tool_id, usage_date)
      DO UPDATE SET usage_count = user_usage.usage_count + 1, updated_at = CURRENT_TIMESTAMP
    `, [userId, toolId]);
  } catch (error) {
    console.error('[Quota] Increment failed:', error);
  }
}
