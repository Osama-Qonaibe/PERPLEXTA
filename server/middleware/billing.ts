import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/index.js';
import { checkUserQuota } from '../services/quota.js';
import { checkUserAffordability } from '../services/billing.js';

/**
 * Express Middleware that wraps tool invocation routes.
 * It calculates estimated costs based on prompt length (using a token conversion estimate of character length / 4),
 * verifies whether the user has sufficient complimentary quota,
 * and if quota is exceeded, checks whether the user has sufficient points/balance in their ledger.
 * Encounters and enforces a strict execution block if funds are insufficient, preventing tool execution.
 */
export const verifyBillingFunds = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return next();
    }

    const toolId = req.body?.tool_id || req.body?.tool || 'chat';
    
    // Retrieve the prompt dynamically to determine estimated input token sizes
    const prompt = req.body?.prompt || req.body?.message || req.body?.content || '';
    const estimatedInputTokens = Math.ceil(prompt.length / 4);

    // 1. Direct validation of available complimentary quota limits
    const quotaCheck = await checkUserQuota(userId, toolId);

    if (!quotaCheck.allowed) {
      if (!pool) {
        return res.status(503).json({ error: 'Database service is temporarily initializing.' });
      }

      // 2. Validate Ledger funds based on the precise estimated prompt length to avoid starting dry executions
      const affordability = await checkUserAffordability(userId, toolId, estimatedInputTokens);

      if (!affordability.allowed) {
        // Enforce strict enforcement barrier
        const uRes = await pool.query('SELECT language FROM users WHERE id = $1', [userId]);
        const userLang = uRes.rows[0]?.language || 'en';

        const periodStrEn = quotaCheck.period === 'daily' ? 'Daily' : 'Monthly';
        const periodStrAr = quotaCheck.period === 'daily' ? 'يومي' : 'شهري';
        const cost = affordability.requiredPoints;

        const msgEn = `Premium Membership Required: You have reached your complimentary ${periodStrEn} capacity for this tool. Please upgrade your plan or recharge your digital wallet (Pay-per-Request: ${cost} Points required, but you have ${affordability.availablePoints} points + $${affordability.availableBalanceUSD} balance).`;
        const msgAr = `تتطلب هذه العملية رصيداً أو عضوية ممتازة: لقد تجاوزت الحد ال${periodStrAr} المسموح به لأداة مخصصة. يرجى شحن محفظتك الرقمية أو ترقية باقتك للاستمرار بالاستفادة بالدفع لكل معاملة (${cost} نقاط مطلوبة، ورصيدك الحالي ${affordability.availablePoints} نقاط + $${affordability.availableBalanceUSD} دولار).`;

        return res.status(402).json({
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
    console.error('[Billing Funds Middleware] Fault during billing/ledger verification:', error);
    return next(); // Safe degraded execution fallback
  }
};
