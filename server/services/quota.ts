import { pool } from '../db/index.js';

export async function checkUserQuota(userId: number, toolId: string) {
  try {
    const res = await pool.query(`
      SELECT uu.usage_count, (p.limits->>$2) as limit_val
      FROM user_usage uu
      JOIN subscriptions s ON uu.user_id = s.user_id
      JOIN plans p ON s.plan_id = p.id
      WHERE uu.user_id = $1 AND uu.tool_id = $2 AND uu.usage_date = CURRENT_DATE
    `, [userId, toolId]);

    if (res.rows.length === 0) return { allowed: true };
    
    const { usage_count, limit_val } = res.rows[0];
    if (limit_val === 'unlimited') return { allowed: true };
    
    const limit = parseInt(limit_val) || 0;
    return { allowed: usage_count < limit };
  } catch (error) {
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
