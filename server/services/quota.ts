import { pool } from '../db/index.js';
import { createNotification } from './notifications.js';
import { io } from '../config/socket.js';

export async function checkUserQuota(userId: number, toolId: string) {
  try {
    if (!pool) return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };

    const subRes = await pool.query(`
      SELECT s.status, s.current_period_end, u.role
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = $1
    `, [userId]);

    const userRole = subRes.rows[0]?.role;
    const row = subRes.rows[0];
    const isSubActive = row?.status === 'active' && row?.current_period_end && new Date(row.current_period_end) > new Date();

    if (userRole !== 'admin' && !isSubActive) {
      return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };
    }

    if (userRole === 'admin') return { allowed: true };

    const res = await pool.query(`
      WITH user_info AS (
        SELECT 
          u.id as user_id,
          u.role,
          p.limits
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active' AND s.current_period_end > NOW()
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
        ui.role,
        (SELECT count FROM daily_usage) as daily_count,
        (SELECT count FROM monthly_usage) as monthly_count
      FROM user_info ui
    `, [userId, toolId]);

    if (res.rows.length === 0) return { allowed: true };
    
    const { limits, daily_count, monthly_count } = res.rows[0];
    
    const currentDaily = parseInt(daily_count || '0');
    const currentMonthly = parseInt(monthly_count || '0');
    
    const finalLimits = limits || {};
    if (Object.keys(finalLimits).length === 0) {
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
  if (!pool) return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const subRes = await client.query(`
      SELECT s.status, s.current_period_end, u.role
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = $1
    `, [userId]);

    const userRole = subRes.rows[0]?.role;
    const subRow = subRes.rows[0];
    const isSubActive = subRow?.status === 'active' && subRow?.current_period_end && new Date(subRow.current_period_end) > new Date();

    if (userRole !== 'admin' && !isSubActive) {
      await client.query('ROLLBACK');
      return { allowed: false, limit: 0, currentUsage: 1, period: 'daily' };
    }

    if (userRole === 'admin') {
      await client.query('COMMIT');
      return { allowed: true };
    }

    await client.query(`
      INSERT INTO user_usage (user_id, tool_id, usage_count, usage_date)
      VALUES ($1, $2, 0, CURRENT_DATE)
      ON CONFLICT (user_id, tool_id, usage_date) DO NOTHING
    `, [userId, toolId]);

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
          p.limits
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active' AND s.current_period_end > NOW()
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
        ui.role,
        (SELECT count FROM daily_usage) as daily_count,
        (SELECT count FROM monthly_usage) as monthly_count
      FROM user_info ui
    `, [userId, toolId]);

    if (res.rows.length === 0) {
      await client.query('COMMIT');
      return { allowed: true };
    }

    const { limits, daily_count, monthly_count } = res.rows[0];
    const currentDaily = parseInt(daily_count || '0');
    const currentMonthly = parseInt(monthly_count || '0');

    const finalLimits = limits || {};
    if (Object.keys(finalLimits).length === 0) {
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

    await client.query(`
      UPDATE user_usage 
      SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND tool_id = $2 AND usage_date = CURRENT_DATE
    `, [userId, toolId]);

    await client.query('COMMIT');

    checkAndTriggerQuotaWarnings(userId, toolId, currentDaily + 1, currentMonthly + 1, finalLimits).catch(err => {
      console.error('[Quota Warning Engine] Non-blocking warning flow failed:', err);
    });

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

function getToolFriendlyName(toolId: string, lang: 'en' | 'ar'): string {
  const mapping: Record<string, { en: string; ar: string }> = {
    'chat': { en: 'Strategic Assistant', ar: 'المساعد الاستراتيجي' },
    'chat_fast': { en: 'Fast Technical AI', ar: 'الذكاء التقني السريع' },
    'chat_pro': { en: 'Reasoning Pro Engine', ar: 'محرك الاستنتاج المتقدم' },
    'chat_reasoning': { en: 'Advanced Reasoning Protocol', ar: 'بروتوكول التفكير المعقد' },
    'perplexta_analysis': { en: 'Perplexta Analysis & Audit', ar: 'تحليل وبحث بيربليكستا' },
    'image': { en: 'Visual Synthesis Engine', ar: 'محرك التوليد البصري' },
    'video': { en: 'Cinematic Video Generator', ar: 'مولد الفيديو السينمائي' },
    'tts': { en: 'Voice Synthesis Engine', ar: 'محرك التوليد الصوتي' },
    'stt': { en: 'Speech Transcription', ar: 'التحويل الصوتي للنص' },
  };
  return mapping[toolId]?.[lang] || toolId;
}

async function evaluateAndNotify(userId: number, toolId: string, usage: number, limit: number, period: 'daily' | 'monthly') {
  const pct = (usage / limit) * 100;

  let threshold = 0;
  if (pct >= 100) {
    threshold = 100;
  } else if (pct >= 80) {
    threshold = 80;
  } else if (pct >= 50) {
    threshold = 50;
  }

  if (threshold === 0) return;

  const warningType = `quota_warning_${toolId}_${period}_${threshold}`;

  const checkRes = await pool.query(`
    SELECT 1 FROM notifications
    WHERE user_id = $1 
      AND type = $2 
      AND created_at >= CASE WHEN $3 = 'daily' THEN CURRENT_DATE ELSE date_trunc('month', CURRENT_DATE) END
    LIMIT 1
  `, [userId, warningType, period]);
  if (checkRes.rows.length > 0) return;

  const toolNameEn = getToolFriendlyName(toolId, 'en');
  const toolNameAr = getToolFriendlyName(toolId, 'ar');
  const periodStrEn = period === 'daily' ? 'Daily' : 'Monthly';
  const periodStrAr = period === 'daily' ? 'اليومي' : 'الشهري';

  let titleEn = '';
  let titleAr = '';
  let messageEn = '';
  let messageAr = '';
  const pctString = `${Math.round(pct)}%`;

  if (threshold === 100) {
    titleEn = `⛔ Quota Exhausted: Limit Reached`;
    titleAr = `⛔ استنفد الحد: وصلت إلى الحد الأقصى`;
    messageEn = `You have fully consumed your ${periodStrEn} quota for "${toolNameEn}" (${usage}/${limit}). Further requests will be charged from your digital wallet. Upgrade your plan to continue uninterrupted.`;
    messageAr = `لقد استنفدت حدك ${periodStrAr} الكامل لأداة "${toolNameAr}" (${usage}/${limit}). سيتم خصم الطلبات الإضافية من محفظتك الرقمية. قم بترقية باقتك للاستمرار دون انقطاع.`;
  } else if (threshold === 80) {
    titleEn = `⚠️ Urgent Quota Limit Notice: ${pctString} Expended`;
    titleAr = `⚠️ تنبيه هام ومستعجل: تم استهلاك ${pctString} من الحدود`;
    messageEn = `Action Advised: You are rapidly approaching full capacity with ${pctString} of your ${periodStrEn} limit spent for "${toolNameEn}". Secure your strategic tasks against interruptions: elevate your workflow by upgrading your tier with a 1-click upgrade, or seamlessly recharge your wallet instantly via the rewards section to utilize point-based fallbacks!`;
    messageAr = `إجراء موصى به: أنت تقترب بسرعة من السعة الكاملة بنسبة استهلاك بلغت ${pctString} من حدك ${periodStrAr} لأداة "${toolNameAr}". حافظ على أمن أعمالك الاستراتيجية من الانقطاع: قم بترقية حسابك بضغطة واحدة، أو أعد شحن محفظتك الرقمية فوراً وبسهولة من قسم المكافآت!`;
  } else {
    titleEn = `ℹ️ Quota Status Alert: ${pctString} Consumed`;
    titleAr = `ℹ️ تنبيه استهلاك الحدود: تم استخدام ${pctString}`;
    messageEn = `Premium Optimization: You have consumed ${pctString} of your ${periodStrEn} active quota limit for "${toolNameEn}". Keep your intelligence momentum at full power! Invite elite colleagues using your personalized referral code to credit your digital wallet instantly, or explore our flexible high-capacity premium tiers today!`;
    messageAr = `تنبيه تحسين الأداء: لقد استهلكت ${pctString} من حدك ${periodStrAr} المتاح لأداة "${toolNameAr}". حافظ على استمرارية زخم تحليلاتك الذكية بكامل قوتها! شارك كود الإحالة المخصص لك مع زملائك المتميزين لكسب أرصدة فورية في محفظتك الرقمية، أو تصفح باقاتنا المرنة ذات السعات العالية اليوم!`;
  }

  await createNotification(userId, warningType, titleEn, titleAr, messageEn, messageAr, {
    tool_id: toolId,
    usage,
    limit,
    period,
    threshold,
    pct
  });

  // Emit real-time socket event so frontend shows the warning immediately
  if (io) {
    io.to(`user_${userId}`).emit('quota_warning', {
      toolId,
      usage,
      limit,
      period,
      threshold,
      pct: Math.round(pct)
    });
  }
}

async function checkAndTriggerQuotaWarnings(userId: number, toolId: string, currentDailyAfter: number, currentMonthlyAfter: number, finalLimits: any) {
  try {
    if (!pool) return;

    const toolLimit = finalLimits[toolId];
    if (!toolLimit || toolLimit === 'unlimited') return;

    let dailyLimitVal = typeof toolLimit === 'object' ? toolLimit.daily : toolLimit;
    let monthlyLimitVal = typeof toolLimit === 'object' ? toolLimit.monthly : null;

    if (dailyLimitVal && dailyLimitVal !== 'unlimited') {
      const limit = parseInt(dailyLimitVal);
      if (!isNaN(limit) && limit > 0) {
        await evaluateAndNotify(userId, toolId, currentDailyAfter, limit, 'daily');
      }
    }

    if (monthlyLimitVal && monthlyLimitVal !== 'unlimited') {
      const limit = parseInt(monthlyLimitVal);
      if (!isNaN(limit) && limit > 0) {
        await evaluateAndNotify(userId, toolId, currentMonthlyAfter, limit, 'monthly');
      }
    }
  } catch (err) {
    console.error('[Quota Warning Engine] Process failed:', err);
  }
}
