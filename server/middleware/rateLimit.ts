import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

const isProd = process.env.NODE_ENV === 'production';
const limitMultiplier = isProd ? 1 : 100;

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
  max: 1500 * limitMultiplier,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

// Login/Signup only — keep strict (30 attempts per 15 min)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30 * limitMultiplier,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security: Too many auth attempts. Please try again later.' }
});

// Dedicated limiter for refresh-token endpoint — must NOT share with authLimiter
export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 40 * limitMultiplier,                    // 40 refreshes per minute per user — well above normal need
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many token refresh attempts. Please wait a moment.' }
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60 * limitMultiplier,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please wait a moment.' }
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10 * limitMultiplier,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again in an hour.' }
});

export const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150 * limitMultiplier,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security alert: Too many token verification requests. Slow down.' }
});

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000 * limitMultiplier,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security: Too many admin requests. Action throttled.' }
});

export const broadcastLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30 * limitMultiplier,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many broadcast attempts. Admin communications are limited.' }
});

export const forumLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 80 * limitMultiplier,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many post or comment requests. Please wait a minute.' }
});

import { pool } from '../db/index.js';
import { checkUserQuota } from '../services/quota.js';
import { checkUserAffordability } from '../services/billing.js';


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

      // Check user affordability using centralized billing service to eliminate scattered hardcoded cost checks
      const affordability = await checkUserAffordability(userId, toolId);

      if (!affordability.allowed) {
        // Extract raw user preferences to construct responsive locale headers
        const uRes = await pool.query('SELECT language FROM users WHERE id = $1', [userId]);
        const userLang = uRes.rows[0]?.language || 'en';

        const periodStrEn = quotaCheck.period === 'daily' ? 'Daily' : 'Monthly';
        const periodStrAr = quotaCheck.period === 'daily' ? 'يومي' : 'شهري';
        const cost = affordability.requiredPoints;

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

