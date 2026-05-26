import { pool } from '../db/index.js';

export async function checkUserQuota(userId: number, toolId: string) {
  try {
    if (!pool) return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' }; // FAIL-CLOSED

    const subRes = await pool.query(`
      SELECT s.status, u.role
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = $1
    `, [userId]);

    const userRole = subRes.rows[0]?.role;
    const isSubActive = subRes.rows.length > 0 && subRes.rows[0].status === 'active';

    if (userRole !== 'admin' && !isSubActive) {
      return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };
    }

    if (userRole === 'admin') return { allowed: true };

    const res = await pool.query(`
      WITH user_info AS (
        SELECT 
          u.id as user_id,
          u.role,
          p.limits,
          u.custom_limits
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        LEFT JOIN plans p ON s.plan_id = p.id
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
        ui.custom_limits,
        ui.role,
        (SELECT count FROM daily_usage) as daily_count,
        (SELECT count FROM monthly_usage) as monthly_count
      FROM user_info ui
    `, [userId, toolId]);

    if (res.rows.length === 0) return { allowed: true };
    
    const { limits, custom_limits, daily_count, monthly_count } = res.rows[0];
    
    const currentDaily = parseInt(daily_count || '0');
    const currentMonthly = parseInt(monthly_count || '0');
    
    const finalLimits = { ...(limits || {}), ...(custom_limits || {}) };
    if (Object.keys(finalLimits).length === 0) {
      // If they are active but have no limits defined yet, allow access as a fallback
      return { allowed: true, currentDaily, currentMonthly };
    }
    
    const toolLimit = finalLimits[toolId];
    if (!toolLimit || toolLimit === 'unlimited') return { allowed: true, currentDaily, currentMonthly };
    
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
    // FAIL-CLOSED: Secure resource boundary protection
    console.error('[Quota] Check failed:', error);
    return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };
  }
}

export async function checkAndIncrementQuota(userId: number, toolId: string): Promise<{
  allowed: boolean;
  limit?: number;
  currentUsage?: number;
  period?: 'daily' | 'monthly';
  currentDaily?: number;
  currentMonthly?: number;
}> {
  if (!pool) return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' }; // FAIL-CLOSED
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Resolve user profile and subscription state
    const subRes = await client.query(`
      SELECT s.status, u.role
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = $1
    `, [userId]);

    const userRole = subRes.rows[0]?.role;
    const isSubActive = subRes.rows.length > 0 && subRes.rows[0].status === 'active';

    if (userRole !== 'admin' && !isSubActive) {
      await client.query('ROLLBACK');
      return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };
    }

    if (userRole === 'admin') {
      await client.query('COMMIT');
      return { allowed: true };
    }

    // 2. Insert row atomically if non-existent to prepare for locks
    await client.query(`
      INSERT INTO user_usage (user_id, tool_id, usage_count, usage_date)
      VALUES ($1, $2, 0, CURRENT_DATE)
      ON CONFLICT (user_id, tool_id, usage_date) DO NOTHING
    `, [userId, toolId]);

    // 3. Lock user_usage records for current user+tool to secure transaction sequences (Race protection)
    await client.query(`
      SELECT usage_count 
      FROM user_usage 
      WHERE user_id = $1 AND tool_id = $2 AND usage_date = CURRENT_DATE
      FOR UPDATE
    `, [userId, toolId]);

    const res = await client.query(`
      WITH user_info AS (
        SELECT 
          u.id as user_id,
          u.role,
          p.limits,
          u.custom_limits
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id
        LEFT JOIN plans p ON s.plan_id = p.id
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
        ui.custom_limits,
        ui.role,
        (SELECT count FROM daily_usage) as daily_count,
        (SELECT count FROM monthly_usage) as monthly_count
      FROM user_info ui
    `, [userId, toolId]);

    if (res.rows.length === 0) {
      await client.query('COMMIT');
      return { allowed: true };
    }

    const { limits, custom_limits, daily_count, monthly_count } = res.rows[0];
    const currentDaily = parseInt(daily_count || '0');
    const currentMonthly = parseInt(monthly_count || '0');

    const finalLimits = { ...(limits || {}), ...(custom_limits || {}) };
    if (Object.keys(finalLimits).length === 0) {
      // If billing active with undefined limit boundaries, default allow as fallback
      await client.query(`
        UPDATE user_usage 
        SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND tool_id = $2 AND usage_date = CURRENT_DATE
      `, [userId, toolId]);
      await client.query('COMMIT');
      return { allowed: true, currentDaily: currentDaily + 1, currentMonthly: currentMonthly + 1 };
    }

    const toolLimit = finalLimits[toolId];
    if (!toolLimit || toolLimit === 'unlimited') {
      await client.query(`
        UPDATE user_usage 
        SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND tool_id = $2 AND usage_date = CURRENT_DATE
      `, [userId, toolId]);
      await client.query('COMMIT');
      return { allowed: true, currentDaily: currentDaily + 1, currentMonthly: currentMonthly + 1 };
    }

    let dailyLimitVal = typeof toolLimit === 'object' ? toolLimit.daily : toolLimit;
    if (dailyLimitVal && dailyLimitVal !== 'unlimited') {
      const dailyLimit = parseInt(dailyLimitVal);
      if (!isNaN(dailyLimit) && currentDaily >= dailyLimit) {
        await client.query('ROLLBACK');
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
        await client.query('ROLLBACK');
        return { 
          allowed: false, 
          limit: monthlyLimit, 
          currentUsage: currentMonthly,
          period: 'monthly'
        };
      }
    }

    // Success: Perform the pessimistic increment and commit
    await client.query(`
      UPDATE user_usage 
      SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND tool_id = $2 AND usage_date = CURRENT_DATE
    `, [userId, toolId]);

    await client.query('COMMIT');
    return { allowed: true, currentDaily: currentDaily + 1, currentMonthly: currentMonthly + 1 };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Quota] checkAndIncrementQuota failed:', error);
    return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };
  } finally {
    client.release();
  }
}

export async function decrementUserUsage(userId: number, toolId: string) {
  try {
    if (!pool) return;
    await pool.query(`
      UPDATE user_usage 
      SET usage_count = GREATEST(0, usage_count - 1), updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND tool_id = $2 AND usage_date = CURRENT_DATE
    `, [userId, toolId]);
  } catch (error) {
    console.error('[Quota] Decrement failed:', error);
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
