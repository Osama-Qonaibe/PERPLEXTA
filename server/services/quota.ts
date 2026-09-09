import { pool } from '../db/index.js';
import { createNotification } from './notifications.js';
import { io } from '../config/socket.js';
import { getCachedSystemSettings } from '../db/queries.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type QuotaResult = {
  allowed: boolean;
  limit?: number;
  currentUsage?: number;
  period?: 'daily' | 'monthly';
  currentDaily?: number;
  currentMonthly?: number;
};

type ToolLimit = 'unlimited' | number | { daily?: number | 'unlimited' | ''; monthly?: number | 'unlimited' | '' };

// ─── Shared SQL ───────────────────────────────────────────────────────────────

const SUB_QUERY = `
  SELECT s.status, s.current_period_end, u.role
  FROM users u
  LEFT JOIN subscriptions s ON u.id = s.user_id
  WHERE u.id = $1
  ORDER BY CASE WHEN s.status = 'active' THEN 0 ELSE 1 END, s.current_period_end DESC NULLS LAST
  LIMIT 1
`;

const USAGE_QUERY = `
  WITH user_info AS (
    SELECT p.limits, u.role
    FROM users u
    LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
    LEFT JOIN plans p ON s.plan_id = p.id
    WHERE u.id = $1
    ORDER BY s.current_period_end DESC NULLS LAST
    LIMIT 1
  )
  SELECT
    ui.limits,
    ui.role,
    COALESCE((SELECT usage_count FROM user_usage WHERE user_id = $1 AND tool_id = $2 AND usage_date = CURRENT_DATE), 0) AS daily_count,
    COALESCE((SELECT SUM(usage_count) FROM user_usage WHERE user_id = $1 AND tool_id = $2 AND usage_date >= date_trunc('month', CURRENT_DATE)), 0) AS monthly_count
  FROM user_info ui
`;

// ─── Internal Helpers ─────────────────────────────────────────────────────────

async function getSubscriptionStatus(userId: number, db: any = pool) {
  const { rows } = await db.query(SUB_QUERY, [userId]);
  const row = rows[0];
  const userRole: string | undefined = row?.role;
  const isSubActive =
    row?.status === 'active' &&
    (!row.current_period_end || new Date(row.current_period_end) > new Date());
  return { userRole, isSubActive, isAdmin: userRole === 'admin' };
}

function parseLimits(raw: any): Record<string, ToolLimit> {
  if (!raw) return {};
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn('[Quota] Corrupted limits JSON in plans table — defaulting to {}');
    return {};
  }
}

function parseLimitVal(val: any): number | 'unlimited' | null {
  if (val === undefined || val === null || val === '') return null;
  if (val === 'unlimited') return 'unlimited';
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function evaluateLimit(current: number, limitVal: any): false | { limit: number; currentUsage: number } {
  const parsed = parseLimitVal(limitVal);
  if (parsed === null || parsed === 'unlimited') return false;
  return current >= parsed ? { limit: parsed, currentUsage: current } : false;
}

function buildDenied(limit: number, currentUsage: number, period: 'daily' | 'monthly'): QuotaResult {
  return { allowed: false, limit, currentUsage, period };
}

function checkLimits(toolLimit: ToolLimit, currentDaily: number, currentMonthly: number): QuotaResult {
  if (!toolLimit) return buildDenied(0, currentDaily, 'daily');
  if (toolLimit === 'unlimited') return { allowed: true, currentDaily, currentMonthly };

  const dailyVal   = typeof toolLimit === 'object' ? toolLimit.daily   : toolLimit;
  const monthlyVal = typeof toolLimit === 'object' ? toolLimit.monthly : null;

  const dailyHit = evaluateLimit(currentDaily, dailyVal);
  if (dailyHit)   return buildDenied(dailyHit.limit,   dailyHit.currentUsage,   'daily');

  const monthlyHit = evaluateLimit(currentMonthly, monthlyVal);
  if (monthlyHit) return buildDenied(monthlyHit.limit, monthlyHit.currentUsage, 'monthly');

  return { allowed: true, currentDaily, currentMonthly };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function checkUserQuota(userId: number, toolId: string): Promise<QuotaResult> {
  try {
    if (!pool) return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };

    const { isSubActive, isAdmin } = await getSubscriptionStatus(userId);
    if (!isAdmin && !isSubActive) return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };
    if (isAdmin && !isSubActive)  return { allowed: true };

    const { rows } = await pool.query(USAGE_QUERY, [userId, toolId]);
    if (!rows.length) return { allowed: true };

    const { limits, daily_count, monthly_count } = rows[0];
    const finalLimits = parseLimits(limits);
    return checkLimits(finalLimits[toolId], parseInt(daily_count), parseInt(monthly_count));

  } catch (err) {
    console.error('[Quota] checkUserQuota failed:', err);
    return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };
  }
}

export async function checkAndIncrementQuota(userId: number, toolId: string): Promise<QuotaResult> {
  if (!pool) return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { isSubActive, isAdmin } = await getSubscriptionStatus(userId, client);
    if (!isAdmin && !isSubActive) { await client.query('ROLLBACK'); return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' }; }
    if (isAdmin && !isSubActive)  { await client.query('COMMIT');   return { allowed: true }; }

    // Ensure row exists then acquire row-level lock
    await client.query(
      `INSERT INTO user_usage (user_id, tool_id, usage_count, usage_date) VALUES ($1,$2,0,CURRENT_DATE) ON CONFLICT DO NOTHING`,
      [userId, toolId]
    );
    await client.query(
      `SELECT usage_count FROM user_usage WHERE user_id=$1 AND tool_id=$2 AND usage_date=CURRENT_DATE FOR UPDATE`,
      [userId, toolId]
    );

    const { rows } = await client.query(USAGE_QUERY, [userId, toolId]);
    if (!rows.length) { await client.query('COMMIT'); return { allowed: true }; }

    const { limits, daily_count, monthly_count } = rows[0];
    const currentDaily   = parseInt(daily_count);
    const currentMonthly = parseInt(monthly_count);
    const finalLimits    = parseLimits(limits);
    const decision       = checkLimits(finalLimits[toolId], currentDaily, currentMonthly);

    if (!decision.allowed) { await client.query('ROLLBACK'); return decision; }

    await client.query(
      `UPDATE user_usage SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id=$1 AND tool_id=$2 AND usage_date=CURRENT_DATE`,
      [userId, toolId]
    );
    await client.query('COMMIT');

    checkAndTriggerQuotaWarnings(userId, toolId, currentDaily + 1, currentMonthly + 1, finalLimits)
      .catch(err => console.error('[Quota Warning Engine] Non-blocking warning flow failed:', err));

    return { allowed: true, currentDaily: currentDaily + 1, currentMonthly: currentMonthly + 1 };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Quota] checkAndIncrementQuota failed:', err);
    return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };
  } finally {
    client.release();
  }
}

export async function decrementUserUsage(userId: number, toolId: string): Promise<void> {
  try {
    if (!pool) return;
    await pool.query(
      `UPDATE user_usage SET usage_count = GREATEST(0, usage_count - 1), updated_at = CURRENT_TIMESTAMP WHERE user_id=$1 AND tool_id=$2 AND usage_date=CURRENT_DATE`,
      [userId, toolId]
    );
  } catch (err) { console.error('[Quota] Decrement failed:', err); }
}

export async function incrementUserUsage(userId: number, toolId: string): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO user_usage (user_id, tool_id, usage_count, usage_date) VALUES ($1,$2,1,CURRENT_DATE)
       ON CONFLICT (user_id, tool_id, usage_date)
       DO UPDATE SET usage_count = user_usage.usage_count + 1, updated_at = CURRENT_TIMESTAMP`,
      [userId, toolId]
    );
  } catch (err) { console.error('[Quota] Increment failed:', err); }
}

// ─── Quota Warning Engine ─────────────────────────────────────────────────────

const TOOL_NAMES: Record<string, { en: string; ar: string }> = {
  chat:               { en: 'Strategic Assistant',         ar: 'المساعد الاستراتيجي'    },
  chat_fast:          { en: 'Fast Technical AI',           ar: 'الذكاء التقني السريع'    },
  chat_pro:           { en: 'Reasoning Pro Engine',        ar: 'محرك الاستنتاج المتقدم'  },
  chat_reasoning:     { en: 'Advanced Reasoning Protocol', ar: 'بروتوكول التفكير المعقد' },
  perplexta_analysis: { en: 'Analysis',                    ar: 'تحليل'                  },
  image:              { en: 'Image',                       ar: 'صورة'                  },
  video:              { en: 'Video',                       ar: 'فيديو'                  },
  code:               { en: 'Code',                        ar: 'كود'                    },
  learning:           { en: 'Education',                   ar: 'تعليم'                  },
  legal_analysis:     { en: 'Legal',                       ar: 'قانون'                  },
  notebook:           { en: 'Research',                    ar: 'بحث'                    },
  tts:                { en: 'Voice Synthesis Engine',      ar: 'محرك التوليد الصوتي'     },
  stt:                { en: 'Speech Transcription',        ar: 'التحويل الصوتي للنص'     },
  perplexta_music:    { en: 'Music & Songs',               ar: 'الموسيقى والأغاني'      },
};

function getToolFriendlyName(toolId: string, lang: 'en' | 'ar'): string {
  return TOOL_NAMES[toolId]?.[lang] ?? toolId;
}

async function evaluateAndNotify(
  userId: number, toolId: string, usage: number, limit: number, period: 'daily' | 'monthly'
) {
  const pct = (usage / limit) * 100;
  
  let lowThreshold = 50;
  let highThreshold = 80;
  try {
    const sysSettings = await getCachedSystemSettings();
    if (sysSettings) {
      if (typeof sysSettings.quota_warning_threshold_low === 'number' && sysSettings.quota_warning_threshold_low > 0) {
        lowThreshold = sysSettings.quota_warning_threshold_low;
      }
      if (typeof sysSettings.quota_warning_threshold_high === 'number' && sysSettings.quota_warning_threshold_high > 0) {
        highThreshold = sysSettings.quota_warning_threshold_high;
      }
    }
  } catch (e) {
    // fallback to defaults
  }

  const threshold = pct >= 100 ? 100 : pct >= highThreshold ? highThreshold : pct >= lowThreshold ? lowThreshold : 0;
  if (!threshold) return;

  const warningType = `quota_warning_${toolId}_${period}_${threshold}`;
  const { rows } = await pool.query(
    `SELECT 1 FROM notifications WHERE user_id=$1 AND type=$2
     AND created_at >= CASE WHEN $3='daily' THEN CURRENT_DATE ELSE date_trunc('month',CURRENT_DATE) END LIMIT 1`,
    [userId, warningType, period]
  );
  if (rows.length) return;

  const nameEn = getToolFriendlyName(toolId, 'en');
  const nameAr = getToolFriendlyName(toolId, 'ar');
  const pEn    = period === 'daily' ? 'Daily'  : 'Monthly';
  const pAr    = period === 'daily' ? 'اليومي' : 'الشهري';
  const pctStr = `${Math.round(pct)}%`;

  const messages: Record<number, { tEn: string; tAr: string; mEn: string; mAr: string }> = {
    100: {
      tEn: '⛔ Quota Exhausted: Limit Reached',
      tAr: '⛔ استنفد الحد: وصلت إلى الحد الأقصى',
      mEn: `You have fully consumed your ${pEn} quota for "${nameEn}" (${usage}/${limit}). Further requests will be charged from your digital wallet. Upgrade your plan to continue uninterrupted.`,
      mAr: `لقد استنفدت حدك ${pAr} الكامل لأداة "${nameAr}" (${usage}/${limit}). سيتم خصم الطلبات الإضافية من محفظتك الرقمية. قم بترقية باقتك للاستمرار دون انقطاع.`,
    },
    [highThreshold]: {
      tEn: `⚠️ Urgent Quota Limit Notice: ${pctStr} Expended`,
      tAr: `⚠️ تنبيه هام ومستعجل: تم استهلاك ${pctStr} من الحدود`,
      mEn: `Action Advised: You are rapidly approaching full capacity with ${pctStr} of your ${pEn} limit spent for "${nameEn}". Upgrade your tier or recharge your wallet to avoid interruptions.`,
      mAr: `إجراء موصى به: أنت تقترب من السعة الكاملة بنسبة ${pctStr} من حدك ${pAr} لأداة "${nameAr}". قم بترقية حسابك أو أعد شحن محفظتك لتجنب الانقطاع.`,
    },
    [lowThreshold]: {
      tEn: `ℹ️ Quota Status Alert: ${pctStr} Consumed`,
      tAr: `ℹ️ تنبيه استهلاك الحدود: تم استخدام ${pctStr}`,
      mEn: `You have consumed ${pctStr} of your ${pEn} quota for "${nameEn}". Invite colleagues with your referral code or explore premium tiers to keep your workflow uninterrupted.`,
      mAr: `لقد استهلكت ${pctStr} من حدك ${pAr} لأداة "${nameAr}". شارك كود الإحالة أو تصفح باقاتنا المتقدمة للحفاظ على استمرارية عملك.`,
    },
  };

  const selectedMsg = messages[threshold] || messages[lowThreshold] || messages[100];
  const { tEn, tAr, mEn, mAr } = selectedMsg;
  await createNotification(userId, warningType, tEn, tAr, mEn, mAr, { tool_id: toolId, usage, limit, period, threshold, pct });

  io?.to(`user_${userId}`).emit('quota_warning', { toolId, usage, limit, period, threshold, pct: Math.round(pct) });
}

async function checkAndTriggerQuotaWarnings(
  userId: number, toolId: string, daily: number, monthly: number, limits: Record<string, ToolLimit>
) {
  try {
    if (!pool) return;
    const toolLimit = limits[toolId];
    if (!toolLimit || toolLimit === 'unlimited') return;

    const dailyVal   = typeof toolLimit === 'object' ? toolLimit.daily   : toolLimit;
    const monthlyVal = typeof toolLimit === 'object' ? toolLimit.monthly : null;

    const dl = parseLimitVal(dailyVal);
    if (typeof dl === 'number' && dl > 0) await evaluateAndNotify(userId, toolId, daily,   dl, 'daily');

    const ml = parseLimitVal(monthlyVal);
    if (typeof ml === 'number' && ml > 0) await evaluateAndNotify(userId, toolId, monthly, ml, 'monthly');

  } catch (err) { console.error('[Quota Warning Engine] Process failed:', err); }
}
