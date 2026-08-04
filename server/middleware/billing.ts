import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/index.js';
import { checkUserQuota } from '../services/quota.js';
import { checkUserAffordability } from '../services/billing.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    language?: string;
    role?: string;
  };
}

/**
 * Express Middleware that wraps tool invocation routes.
 * It calculates estimated costs based on token conversion estimates,
 * verifies whether the user has sufficient complimentary quota,
 * and if quota is exceeded, checks whether the user has sufficient points/balance in their ledger.
 * Enforces strict execution block if funds are insufficient, preventing unbilled tool execution.
 */
export const verifyBillingFunds = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database service is temporarily initializing.', error_ar: 'خدمة قاعدة البيانات قيد التهيئة مؤقتاً.' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required for billing verification.', error_ar: 'المصادقة مطلوبة للتحقق من الفوترة.' });
    }

    const toolId = req.body?.tool_id || req.body?.tool || 'chat';
    const prompt = req.body?.prompt || req.body?.message || req.body?.content || '';
    const estimatedInputTokens = Math.ceil(prompt.length / 4);

    const quotaCheck = await checkUserQuota(userId, toolId);

    if (!quotaCheck.allowed) {
      const affordability = await checkUserAffordability(userId, toolId, estimatedInputTokens);

      if (!affordability.allowed) {
        let userLang = req.user?.language;
        if (!userLang) {
          const uRes = await pool.query('SELECT language FROM users WHERE id = $1', [userId]);
          userLang = uRes.rows[0]?.language || 'en';
        }

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
  } catch (error: any) {
    console.error('[Billing Funds Middleware] Fault during billing/ledger verification:', error);
    return res.status(500).json({
      error: 'Billing verification failed due to a system error. Please try again.',
      error_ar: 'فشل التحقق من الفوترة بسبب خطأ في النظام. يرجى المحاولة مرة أخرى.',
      type: 'BILLING_SYSTEM_ERROR'
    });
  }
};

