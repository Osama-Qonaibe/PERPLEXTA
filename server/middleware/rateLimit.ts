import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

const resolveClientKey = (req: any): string => {
  if (req.user?.id) {
    return `user_${req.user.id}`;
  }
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      return `auth_${token.slice(-20)}`;
    }
  }
  if (req.cookies && req.cookies.token) {
    return `cookie_${req.cookies.token.slice(-20)}`;
  }
  return ipKeyGenerator(req.ip || 'anonymous');
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

// Login/Signup only — keep strict (10 attempts per 15 min)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security: Too many auth attempts. Please try again later.' }
});

// Dedicated limiter for refresh-token endpoint — must NOT share with authLimiter
export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 10,                    // 10 refreshes per minute per user — well above normal need
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many token refresh attempts. Please wait a moment.' }
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please wait a moment.' }
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again in an hour.' }
});

export const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security alert: Too many token verification requests. Slow down.' }
});

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security: Too many admin requests. Action throttled.' }
});

export const broadcastLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many broadcast attempts. Admin communications are limited.' }
});

export const forumLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many post or comment requests. Please wait a minute.' }
});

import { pool } from '../db/index.js';
import { checkUserQuota } from '../services/quota.js';


export const verifyConsumptionLimits = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next();
    }

    const toolId = req.body?.tool_id || req.body?.tool || 'chat';

    // 1. Direct database check of core usage rules (guarantees zero-cached query execution)
    const quotaCheck = await checkUserQuota(userId, toolId);

    if (!quotaCheck.allowed) {
      if (!pool) {
        return res.status(503).json({ error: 'Database service is temporarily initializing.' });
      }

      // 2. Direct database wallet query to verify if the user has points/balance for pay-per-request fallback
      const walletRes = await pool.query('SELECT points, balance FROM wallets WHERE user_id = $1', [userId]);
      const hasWallet = walletRes.rows.length > 0;
      const points = hasWallet ? parseFloat(walletRes.rows[0].points || '0') : 0;
      const balance = hasWallet ? parseFloat(walletRes.rows[0].balance || '0') : 0;

      const toolRes = await pool.query("SELECT cost_per_usage FROM tool_orchestrator WHERE tool_id = $1 AND is_active = true", [toolId]);
      const cost = toolRes.rows.length > 0 ? parseFloat(toolRes.rows[0].cost_per_usage || '10') : 10;

      // Extract raw user preferences to construct responsive locale headers
      const uRes = await pool.query('SELECT language FROM users WHERE id = $1', [userId]);
      const userLang = uRes.rows[0]?.language || 'en';

      const periodStrEn = quotaCheck.period === 'daily' ? 'Daily' : 'Monthly';
      const periodStrAr = quotaCheck.period === 'daily' ? 'يومي' : 'شهري';

      // If user lacks both sufficient point tokens and cash wallet balance, block them immediately
      if (points < cost && balance < (cost / 10)) {
        const msgEn = `Premium Membership Required: You have reached your ${periodStrEn} capacity for this tool. Please upgrade your plan or recharge your digital wallet (Pay-per-Request: ${cost} Points) to execute excess actions.`;
        const msgAr = `تتطلب هذه العملية رصيداً أو عضوية ممتازة: لقد تجاوزت الحد ال${periodStrAr} المسموح به لأداة مخصصة. يرجى شحن محفظتك الرقمية أو ترقية باقتك للاستمرار بالاستفادة بالدفع لكل معاملة (${cost} نقاط).`;

        return res.status(429).json({
          error: userLang === 'ar' ? msgAr : msgEn,
          error_ar: msgAr,
          type: 'QUOTA_EXCEEDED',
          limit: quotaCheck.limit,
          current: quotaCheck.currentUsage,
          period: quotaCheck.period,
          cta: {
            upgrade: true,
            referral: true
          }
        });
      }
    }

    return next();
  } catch (error) {
    console.error('[Consumption Limiter Middleware] Quota enforcement failure:', error);
    return next(); // Safe degraded bypass
  }
};

