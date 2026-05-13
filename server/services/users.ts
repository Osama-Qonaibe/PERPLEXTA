import { pool, ledgerPool } from '../db/index.js';
import { io } from '../config/socket.js';
import { getUserStorageUsage } from './files.js';

export async function getUserUsage(userId: string | number) {
  if (!pool) throw new Error('Database initializing');

  // 1. Get Plan & Constraints
  const planRes = await pool.query(`
    SELECT p.id, p.name_en, p.name_ar, p.limits, s.status, s.billing_cycle
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id
    LEFT JOIN plans p ON (s.plan_id = p.id OR (s.plan_id IS NULL AND p.name_en = 'Starter'))
    WHERE u.id = $1
    LIMIT 1
  `, [userId]);

  if (planRes.rows.length === 0) throw new Error('Plan not found');
  const plan = planRes.rows[0];

  // 2. Get Daily Usage
  const dailyUsageRes = await pool.query(`
    SELECT tool_id, usage_count
    FROM user_usage
    WHERE user_id = $1 AND usage_date = CURRENT_DATE
  `, [userId]);

  const dailyUsageMap = dailyUsageRes.rows.reduce((acc: any, row: any) => {
    acc[row.tool_id] = parseInt(row.usage_count);
    return acc;
  }, {});

  // 3. Get Monthly Usage (Aggregation)
  const monthlyUsageRes = await pool.query(`
    SELECT tool_id, SUM(usage_count) as total
    FROM user_usage
    WHERE user_id = $1 AND usage_date >= date_trunc('month', CURRENT_DATE)
    GROUP BY tool_id
  `, [userId]);

  const monthlyUsageMap = monthlyUsageRes.rows.reduce((acc: any, row: any) => {
    acc[row.tool_id] = parseInt(row.total);
    return acc;
  }, {});

  // 4. Get Storage Usage
  const storageUsageMB = await getUserStorageUsage(userId.toString());

  // 5. Combine Tools
  const ALL_TOOLS = [
    'perplexta_analysis', 'legal_analysis', 'notebook', 'image', 'video', 
    'stt', 'tts', 'learning', 'code', 'canvas', 'sovereign_memory', 'storage_mb'
  ];

  const usageItems = ALL_TOOLS.map(toolId => {
    const limits = plan.limits?.[toolId] || null;
    
    // Normalize limits
    let dailyLimit = null;
    let monthlyLimit = null;
    
    if (limits === 'unlimited') {
      dailyLimit = null;
      monthlyLimit = null;
    } else if (typeof limits === 'object' && limits !== null) {
      dailyLimit = limits.daily !== undefined ? parseInt(limits.daily) : null;
      monthlyLimit = limits.monthly !== undefined ? parseInt(limits.monthly) : null;
    } else if (limits !== undefined && limits !== null) {
      dailyLimit = parseInt(limits);
    }

    // Special handling for storage_mb
    let dailyUsage = dailyUsageMap[toolId] || 0;
    let monthlyUsage = monthlyUsageMap[toolId] || 0;

    if (toolId === 'storage_mb') {
      dailyUsage = storageUsageMB; // Use total storage as "usage"
      monthlyUsage = storageUsageMB; 
    }

    return {
      id: toolId,
      name_en: toolId.replace(/_/g, ' ').toUpperCase(), // Fallback names if translations missing in component
      name_ar: toolId,
      usage: {
        daily: dailyUsage,
        monthly: monthlyUsage
      },
      limits: {
        daily: dailyLimit,
        monthly: monthlyLimit
      }
    };
  });

  return {
    plan: {
      name_en: plan.name_en,
      name_ar: plan.name_ar,
      limits: plan.limits,
      status: plan.status || 'Active',
      billing_period: plan.billing_cycle || 'Monthly'
    },
    usage: usageItems
  };
}

export async function getUserProfile(userId: string) {
  if (!pool) throw new Error('Database initializing');
  
  const result = await pool.query(`
    SELECT u.id, u.name, u.email, u.role, u.avatar, u.status, u.language, u.theme, u.custom_instructions, u.kyc_status, u.created_at,
           s.plan_id, s.status as sub_status, s.current_period_end, p.name_en as plan_name_en, p.name_ar as plan_name_ar, p.color as plan_color, p.limits
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id
    LEFT JOIN plans p ON s.plan_id = p.id
    WHERE u.id = $1
  `, [userId]);
  
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  
  const walletRes = await (ledgerPool || pool).query('SELECT balance, points FROM wallets WHERE user_id = $1', [userId]);
  const wallet = walletRes.rows[0] || { balance: 0.0, points: 0 };
  
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    avatar: row.avatar,
    status: row.status,
    language: row.language,
    theme: row.theme,
    custom_instructions: row.custom_instructions,
    kyc_status: row.kyc_status,
    created_at: row.created_at,
    subscription: row.plan_id ? {
      plan_id: row.plan_id,
      status: row.sub_status,
      current_period_end: row.current_period_end,
      plan_name_en: row.plan_name_en,
      plan_name_ar: row.plan_name_ar,
      plan_color: row.plan_color,
      limits: row.limits
    } : null,
    balance: wallet.balance,
    points: parseInt(wallet.points)
  };
}

export async function updateUserProfile(userId: string, data: any) {
  if (!pool) throw new Error('Database initializing');
  
  const { name, avatar, language, theme, custom_instructions } = data;
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
  if (avatar !== undefined) { updates.push(`avatar = $${idx++}`); values.push(avatar); }
  if (language !== undefined) { updates.push(`language = $${idx++}`); values.push(language); }
  if (theme !== undefined) { updates.push(`theme = $${idx++}`); values.push(theme); }
  if (custom_instructions !== undefined) { updates.push(`custom_instructions = $${idx++}`); values.push(custom_instructions); }

  if (updates.length === 0) return await getUserProfile(userId);

  values.push(userId);
  const query = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
  
  await pool.query(query, values);
  
  // Emit real-time update
  if (io) {
    io.to(`user_${userId}`).emit('user_profile_updated');
  }

  return await getUserProfile(userId);
}
