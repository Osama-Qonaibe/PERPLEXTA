import { pool, ledgerPool } from '../db/index.js';
import { io } from '../config/socket.js';
import { getUserStorageUsage } from './files.js';
import bcrypt from 'bcryptjs';

const TOOL_INFO: Record<string, { name_en: string, name_ar: string, desc_en: string, desc_ar: string }> = {
  'perplexta_analysis': { 
    name_en: 'Perplexta Analysis', 
    name_ar: 'تحليل بيربليكستا',
    desc_en: 'Deep AI-powered research and analysis.',
    desc_ar: 'بحث وتحليل عميق مدعوم بالذكاء الاصطناعي.'
  },
  'legal_analysis': { 
    name_en: 'Legal Analysis', 
    name_ar: 'التحليل القانوني',
    desc_en: 'Specialized legal document review and intelligence.',
    desc_ar: 'مراجعة الوثائق القانونية المتخصصة والاستخبارات.'
  },
  'notebook': { 
    name_en: 'Sovereign Notebook', 
    name_ar: 'المفكرة السيادية',
    desc_en: 'Organize and connect your thoughts with AI.',
    desc_ar: 'نظم واربط أفكارك بمساعدة الذكاء الاصطناعي.'
  },
  'image': { 
    name_en: 'Image Generation', 
    name_ar: 'توليد الصور',
    desc_en: 'Create professional visual assets from text.',
    desc_ar: 'أنشئ أصولاً بصرية احترافية من النصوص.'
  },
  'video': { 
    name_en: 'Video Generation', 
    name_ar: 'توليد الفيديو',
    desc_en: 'Cinematic AI video production from prompts.',
    desc_ar: 'إنتاج فيديوهات سينمائية من الأوامر النصية.'
  },
  'stt': { 
    name_en: 'Speech-to-Text', 
    name_ar: 'تحويل الصوت لنص',
    desc_en: 'High-precision audio transcription.',
    desc_ar: 'نسخ صوتي بدقة عالية.'
  },
  'tts': { 
    name_en: 'Text-to-Speech', 
    name_ar: 'تحويل النص لصوت',
    desc_en: 'Natural-sounding AI voice narration.',
    desc_ar: 'سرد صوتي طبيعي مدعوم بالذكاء الاصطناعي.'
  },
  'learning': { 
    name_en: 'Deep Learning', 
    name_ar: 'التعلم العميق',
    desc_en: 'Accelerated skill acquisition and education.',
    desc_ar: 'اكتساب المهارات والتعليم المعزز.'
  },
  'code': { 
    name_en: 'Code Engineering', 
    name_ar: 'هندسة البرمجيات',
    desc_en: 'Developer-grade coding and debugging.',
    desc_ar: 'برمجة وتصحيح أخطاء بمستوى المطورين.'
  },
  'canvas': { 
    name_en: 'Creative Canvas', 
    name_ar: 'اللوحة الإبداعية',
    desc_en: 'Collaborative AI design and brainstorming.',
    desc_ar: 'تصميم وعصف ذهني تعاوني بالذكاء الاصطناعي.'
  },
  'sovereign_memory': { 
    name_en: 'Sovereign Memory', 
    name_ar: 'الذاكرة السيادية',
    desc_en: 'Persistent AI personalization and context.',
    desc_ar: 'تخصيص وسياق دائم للذكاء الاصطناعي.'
  },
  'storage_mb': { 
    name_en: 'Vault Storage', 
    name_ar: 'سعة التخزين',
    desc_en: 'Secure storage for your intelligence assets.',
    desc_ar: 'تخزين آمن لأصولك الاستخباراتية.'
  }
};

export async function getUserUsage(userId: string | number) {
  if (!pool) throw new Error('Database initializing');

  const planRes = await pool.query(`
    SELECT p.id, p.name_en, p.name_ar, p.limits, p.color, s.status, s.billing_period, s.current_period_end, s.created_at as subscription_start
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE u.id = $1
    LIMIT 1
  `, [userId]);

  if (planRes.rows.length === 0) throw new Error('User profile not found');
  
  let plan = planRes.rows[0];

  // If no active plan via subscription, fallback to Starter plan explicitly
  if (!plan.id) {
    const starterRes = await pool.query("SELECT * FROM plans WHERE name_en = 'Starter' OR name_en = 'starter' LIMIT 1");
    if (starterRes.rows.length > 0) {
      plan = { ...plan, ...starterRes.rows[0] };
    } else {
      // Emergency fallback if even Starter is missing
      plan = { ...plan, name_en: 'Starter', name_ar: 'البداية', limits: {}, color: '#10b981' };
    }
  }

  const dailyUsageRes = await pool.query(`
    SELECT tool_id, usage_count
    FROM user_usage
    WHERE user_id = $1 AND usage_date = CURRENT_DATE
  `, [userId]);

  const dailyUsageMap = dailyUsageRes.rows.reduce((acc: any, row: any) => {
    acc[row.tool_id] = parseInt(row.usage_count);
    return acc;
  }, {});

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

  const storageUsageMB = await getUserStorageUsage(userId.toString());

  const ALL_TOOLS = Object.keys(TOOL_INFO);

  const usageItems = ALL_TOOLS.map(toolId => {
    const info = TOOL_INFO[toolId];
    const limits = plan.limits?.[toolId] || null;
    
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

    let dailyUsage = dailyUsageMap[toolId] || 0;
    let monthlyUsage = monthlyUsageMap[toolId] || 0;

    if (toolId === 'storage_mb') {
      dailyUsage = storageUsageMB;
      monthlyUsage = storageUsageMB; 
    }

    return {
      id: toolId,
      name_en: info.name_en,
      name_ar: info.name_ar,
      desc_en: info.desc_en,
      desc_ar: info.desc_ar,
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
      color: plan.color || '#10b981',
      status: plan.status || 'Active',
      billing_period: plan.billing_period || 'Monthly',
      current_period_end: plan.current_period_end,
      subscription_start: plan.subscription_start
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
  
  let subscription = row.plan_id ? {
    plan_id: row.plan_id,
    status: row.sub_status,
    current_period_end: row.current_period_end,
    plan_name_en: row.plan_name_en,
    plan_name_ar: row.plan_name_ar,
    plan_color: row.plan_color,
    limits: row.limits
  } : null;

  // Fallback if no subscription found
  if (!subscription) {
    const starterRes = await pool.query("SELECT * FROM plans WHERE name_en = 'Starter' OR name_en = 'starter' LIMIT 1");
    if (starterRes.rows.length > 0) {
      const p = starterRes.rows[0];
      subscription = {
        plan_id: p.id,
        status: 'active',
        current_period_end: null,
        plan_name_en: p.name_en,
        plan_name_ar: p.name_ar,
        plan_color: p.color,
        limits: p.limits
      };
    } else {
      subscription = {
        plan_id: 0,
        status: 'active',
        current_period_end: null,
        plan_name_en: 'Starter',
        plan_name_ar: 'البداية',
        plan_color: '#10b981',
        limits: {}
      };
    }
  }
  
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
    subscription,
    balance: wallet.balance,
    points: parseInt(wallet.points)
  };
}

export async function updateUserProfile(userId: string, data: any) {
  if (!pool) throw new Error('Database initializing');
  
  const { name, avatar, language, theme, custom_instructions, password, email } = data;
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
  if (avatar !== undefined) { updates.push(`avatar = $${idx++}`); values.push(avatar); }
  if (language !== undefined) { updates.push(`language = $${idx++}`); values.push(language); }
  if (theme !== undefined) { updates.push(`theme = $${idx++}`); values.push(theme); }
  if (custom_instructions !== undefined) { updates.push(`custom_instructions = $${idx++}`); values.push(custom_instructions); }
  if (email !== undefined) { updates.push(`email = $${idx++}`); values.push(email); }
  
  if (password !== undefined && password !== '') {
    const hash = await bcrypt.hash(password, 10);
    updates.push(`password_hash = $${idx++}`);
    values.push(hash);
  }

  if (updates.length === 0) return await getUserProfile(userId);

  values.push(userId);
  const query = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
  
  await pool.query(query, values);
  
  if (io) {
    io.to(`user_${userId}`).emit('user_profile_updated');
  }

  return await getUserProfile(userId);
}
