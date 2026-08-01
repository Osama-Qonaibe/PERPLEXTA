import { pool, ledgerPool } from '../db/index.js';
import { io } from '../config/socket.js';
import { getUserStorageUsage } from './files.js';
import bcrypt from 'bcryptjs';
import { walletLoader } from '../db/queries.js';

const TOOL_INFO: Record<string, { name_en: string, name_ar: string, desc_en: string, desc_ar: string }> = {
  'chat': {
    name_en: 'General Chat',
    name_ar: 'المحادثة العامة',
    desc_en: 'Standard model conversation and assistance.',
    desc_ar: 'المحادثة القياسية لتقديم المساعدة والاستشارات.'
  },
  'chat_fast': {
    name_en: 'Fast Chat',
    name_ar: 'المحادثة السريعة',
    desc_en: 'High-speed model operations and response generation.',
    desc_ar: 'استجابات فائقة السرعة لسير العمل اليومي.'
  },
  'chat_pro': {
    name_en: 'Pro Chat',
    name_ar: 'المحادثة المتقدمة',
    desc_en: 'High-fidelity contextual analysis and reasoning capabilities.',
    desc_ar: 'تحليل دقيق ومناقشات فنية عميقة للمحترفين.'
  },
  'chat_reasoning': {
    name_en: 'Thinking Chat',
    name_ar: 'محادثة التفكير والتحليل',
    desc_en: 'Deep multi-step cognitive processing and visual design logic.',
    desc_ar: 'ذكاء مخصص للتفكير متعدد الخطوات وتصميم الحلول المعقدة.'
  },
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
    name_en: 'Perplexta Notebook', 
    name_ar: 'مفكرة بيربليكستا',
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
    name_en: 'Education Assistant', 
    name_ar: 'مساعد التعليم',
    desc_en: 'Advanced tool for strategic education and intelligence tutoring.',
    desc_ar: 'مساعد ذكي متقدم للتعليم والتدريب الاستراتيجي.'
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
    desc_en: 'Unified sovereign system intelligence and long-term memory synthesis.',
    desc_ar: 'ذاكرة النظام السيادية الموحدة وتركيب المعارف طويلة الأمد.'
  },
  'sovereign_search': { 
    name_en: 'Sovereign Search', 
    name_ar: 'البحث السيادي',
    desc_en: 'Global real-time web intelligence and strategic knowledge extraction.',
    desc_ar: 'البحث الذكي العالمي في الوقت الفعلي واستخراج المعرفة الاستراتيجية.'
  },
  'x402_api': {
    name_en: 'Agent Gateway (x402 API)',
    name_ar: 'بوابة الـ API (x402)',
    desc_en: 'AI analytics integration gateway for programmatic execution.',
    desc_ar: 'بوابة برمجية متطورة لتكامل النماذج والتحليلات للوكلاء.'
  },
  'storage_mb': { 
    name_en: 'Vault Storage', 
    name_ar: 'سعة التخزين',
    desc_en: 'Secure storage for your intelligence assets.',
    desc_ar: 'تخزين آمن لأصولك الاستخباراتية.'
  },
  'marketplace_listings': {
    name_en: 'Marketplace Listings',
    name_ar: 'منتجات السوق الأساسية',
    desc_en: 'List and showcase your custom intelligence tools or data assets.',
    desc_ar: 'إدراج وعرض أدوات الذكاء المخصصة أو أصول البيانات الخاصة بك.'
  }
};

const ABSOLUTE_TOOLS = new Set(['storage_mb', 'marketplace_listings']);

export async function getUserUsage(userId: string | number) {
  if (!pool) throw new Error('Database initializing');

  const planRes = await pool.query(`
    SELECT u.role, p.id, p.name_en, p.name_ar, p.limits, p.color, s.status, s.billing_period, s.current_period_end, s.created_at as subscription_start
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE u.id = $1
    ORDER BY CASE WHEN s.status = 'active' THEN 0 ELSE 1 END, s.current_period_end DESC NULLS LAST
    LIMIT 1
  `, [userId]);

  if (planRes.rows.length === 0) throw new Error('User profile not found');
  
  let plan = planRes.rows[0];
  const userRole = plan.role;
  const isAdmin = userRole === 'admin';
  const hasActiveSub = plan.id && plan.status === 'active';

  if (!isAdmin && !hasActiveSub) {
    plan = {
      ...plan,
      id: null,
      name_en: 'No Active Subscription',
      name_ar: 'لا يوجد اشتراك نشط',
      limits: {},
      color: '#ef4444',
      status: 'inactive',
      billing_period: 'None',
      current_period_end: null,
      subscription_start: null
    };
  } else if (isAdmin && !plan.id) {
    plan = {
      ...plan,
      id: -1,
      name_en: 'Sovereign Administrator',
      name_ar: 'الرئيس التنفيذي للمنصة',
      limits: {},
      color: '#10b981',
      status: 'active',
      billing_period: 'Lifetime',
      current_period_end: null,
      subscription_start: null
    };
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

  const marketplaceCountRes = await pool.query('SELECT COUNT(*) FROM marketplace_items WHERE user_id = $1', [userId]);
  const marketplaceCount = parseInt(marketplaceCountRes.rows[0]?.count || '0', 10);

  const ALLOWED_VISIBLE_TOOLS = [
    'chat',
    'chat_fast',
    'chat_pro',
    'chat_reasoning',
    'perplexta_analysis',
    'legal_analysis',
    'notebook',
    'image',
    'video',
    'stt',
    'tts',
    'learning',
    'code',
    'canvas'
  ];

  const usageItems = ALLOWED_VISIBLE_TOOLS.map(toolId => {
    const info = TOOL_INFO[toolId];
    const isAbsolute = ABSOLUTE_TOOLS.has(toolId);

    if (isAdmin && !hasActiveSub) {
      let currentUsage = 0;
      if (toolId === 'storage_mb') currentUsage = storageUsageMB;
      else if (toolId === 'marketplace_listings') currentUsage = marketplaceCount;
      else currentUsage = monthlyUsageMap[toolId] || 0;

      return {
        id: toolId,
        name_en: info.name_en,
        name_ar: info.name_ar,
        desc_en: info.desc_en,
        desc_ar: info.desc_ar,
        usage: {
          daily: isAbsolute ? currentUsage : (dailyUsageMap[toolId] || 0),
          monthly: currentUsage,
          ...(isAbsolute && { total: currentUsage })
        },
        limits: { daily: null, monthly: null }
      };
    }

    const parsedLimits = typeof plan.limits === 'object' && plan.limits !== null ? plan.limits : (typeof plan.limits === 'string' ? JSON.parse(plan.limits || '{}') : {});
    const rawLimits = parsedLimits?.[toolId] ?? null;
    let dailyLimit: number | null = null;
    let monthlyLimit: number | null = null;
    let totalLimit: number | null = null;

    if (!hasActiveSub) {
      dailyLimit = 0;
      monthlyLimit = 0;
      totalLimit = isAbsolute ? 0 : null;
    } else if (rawLimits === 'unlimited') {
      dailyLimit = null;
      monthlyLimit = null;
    } else if (typeof rawLimits === 'object' && rawLimits !== null) {
      dailyLimit   = rawLimits.daily   !== undefined ? parseInt(rawLimits.daily)   : null;
      monthlyLimit = rawLimits.monthly !== undefined ? parseInt(rawLimits.monthly) : null;
      totalLimit   = rawLimits.total   !== undefined ? parseInt(rawLimits.total)   : null;
    } else if (rawLimits !== null && rawLimits !== undefined) {
      const parsed = parseInt(rawLimits);
      if (!isNaN(parsed)) {
        dailyLimit = parsed;
        monthlyLimit = parsed;
      }
    } else {
      dailyLimit = 0;
      monthlyLimit = 0;
      totalLimit = isAbsolute ? 0 : null;
    }

    let dailyUsage: number;
    let monthlyUsage: number;

    if (toolId === 'storage_mb') {
      dailyUsage = storageUsageMB;
      monthlyUsage = storageUsageMB;
    } else if (toolId === 'marketplace_listings') {
      dailyUsage = marketplaceCount;
      monthlyUsage = marketplaceCount;
    } else {
      dailyUsage = dailyUsageMap[toolId] || 0;
      monthlyUsage = monthlyUsageMap[toolId] || 0;
    }

    const result: any = {
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
        daily: isAbsolute ? null : dailyLimit,
        monthly: isAbsolute ? null : monthlyLimit
      }
    };

    if (isAbsolute) {
      result.usage.total = dailyUsage;
      result.limits.total = totalLimit ?? dailyLimit; // fallback to dailyLimit if no explicit total
    }

    return result;
  });

  return {
    plan: {
      id: plan.id,
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
    SELECT u.id, u.name, u.email, u.role, u.avatar, u.status, u.language, u.theme, u.custom_instructions, u.kyc_status, u.created_at, u.referral_code,
           s.plan_id, s.status as sub_status, s.current_period_end, p.name_en as plan_name_en, p.name_ar as plan_name_ar, p.color as plan_color, p.limits
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id
    LEFT JOIN plans p ON s.plan_id = p.id
    WHERE u.id = $1
    ORDER BY CASE WHEN s.status = 'active' THEN 0 ELSE 1 END, s.current_period_end DESC NULLS LAST
    LIMIT 1
  `, [userId]);
  
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  
  const wallet = await walletLoader.load(userId) || { balance: 0.0, points: 0, referral_activated: false };
  
  let subscription = null;

  if (row.plan_id) {
    const rawLimits = typeof row.limits === 'object' && row.limits !== null ? row.limits : (typeof row.limits === 'string' ? JSON.parse(row.limits || '{}') : {});
    subscription = {
      plan_id: row.plan_id,
      status: row.sub_status,
      current_period_end: row.current_period_end,
      plan_name_en: row.plan_name_en,
      plan_name_ar: row.plan_name_ar,
      plan_color: row.plan_color,
      limits: rawLimits
    };
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
    referral_code: row.referral_code,
    custom_limits: {},
    subscription,
    balance: wallet.balance,
    points: parseInt(wallet.points),
    referral_activated: !!wallet.referral_activated
  };
}

export async function updateUserProfile(userId: string | number, data: any) {
  if (!pool) throw new Error('Database initializing');
  
  const { name, avatar, language, theme, custom_instructions, password, email } = data;
  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (name !== undefined) {
    if (name !== null && typeof name !== 'string') throw new Error('Name must be a string');
    updates.push(`name = $${idx++}`);
    values.push(name);
  }

  if (avatar !== undefined) {
    if (avatar !== null && typeof avatar !== 'string') throw new Error('Avatar URL must be a string');
    updates.push(`avatar = $${idx++}`);
    values.push(avatar);
  }

  if (language !== undefined) {
    if (typeof language !== 'string') throw new Error('Language must be a string');
    const cleanLang = language.trim().toLowerCase();
    if (cleanLang !== 'en' && cleanLang !== 'ar') throw new Error('Invalid language specified. Must be "en" or "ar".');
    updates.push(`language = $${idx++}`);
    values.push(cleanLang);
  }

  if (theme !== undefined) {
    if (typeof theme !== 'string') throw new Error('Theme must be a string');
    const cleanTheme = theme.trim().toLowerCase();
    if (cleanTheme !== 'light' && cleanTheme !== 'dark') throw new Error('Invalid theme specified. Must be "light" or "dark".');
    updates.push(`theme = $${idx++}`);
    values.push(cleanTheme);
  }

  if (custom_instructions !== undefined) {
    if (custom_instructions !== null && typeof custom_instructions !== 'string') throw new Error('Custom instructions must be a string');
    updates.push(`custom_instructions = $${idx++}`);
    values.push(custom_instructions);
  }

  if (email !== undefined) {
    if (typeof email !== 'string') throw new Error('Email must be a string');
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) throw new Error('Invalid email format');
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [cleanEmail, userId]);
    if (emailCheck.rows.length > 0) throw new Error('Email is already in use by another account');
    updates.push(`email = $${idx++}`);
    values.push(cleanEmail);
  }
  
  if (password !== undefined && password !== '') {
    if (typeof password !== 'string') throw new Error('Password must be a string');
    if (password.length < 8) throw new Error('Password must be at least 8 characters long');
    const hash = await bcrypt.hash(password, 10);
    updates.push(`password_hash = $${idx++}`);
    values.push(hash);
  }

  const userIdStr = userId.toString();
  if (updates.length === 0) return await getUserProfile(userIdStr);

  values.push(userIdStr);
  const query = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`;
  await pool.query(query, values);
  
  if (io) io.to(`user_${userIdStr}`).emit('user_profile_updated');

  return await getUserProfile(userIdStr);
}
