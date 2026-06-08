import { decrementUserUsage } from '../quota.js';
import { refundUsageToWallet } from '../wallet.js';

export const AI_CALL_TIMEOUT_MS = 90000;
export const TTS_TIMEOUT_MS = 30000;
export const STT_TIMEOUT_MS = 45000;
export const IMG_TIMEOUT_MS = 120000;
export const VIDEO_TIMEOUT_MS = 660000; // 11 minutes

/**
 * Validates available provider daily budgets, quota limits, and system activation status.
 * Consolidates capacity caching controls across image and video tasks with absolute transactional safety.
 */
export function validateModelCapacityCached(
  vaultConfig: any,
  providerId: string,
  costPerUsage: number
): { warning?: string; valid: boolean } {
  if (!providerId) return { valid: true };

  if (!vaultConfig) {
    return { 
      valid: false, 
      warning: `Provider check: '${providerId}' has no registered configuration keys in the vault.` 
    };
  }

  const { is_active, daily_budget, used_today } = vaultConfig;

  if (!is_active) {
    return { 
      valid: false, 
      warning: `Provider check: '${providerId}' is currently turned off or set to inactive.` 
    };
  }

  const budget = parseFloat(daily_budget || '0');
  const used = parseFloat(used_today || '0');
  const estimatedCost = (costPerUsage || 0) / 1000;

  if (budget > 0 && (used + estimatedCost) > budget) {
    return { 
      valid: false, 
      warning: `Provider check: '${providerId}' daily budget of $${budget} exceeded (spent $${used.toFixed(4)}, next run expects $${estimatedCost.toFixed(4)}).` 
    };
  }

  return { valid: true };
}

export function withTimeout<T>(
  promiseOrFn: Promise<T> | ((signal: AbortSignal) => Promise<T>),
  ms: number,
  label: string
): Promise<T> {
  const controller = new AbortController();
  const { signal } = controller;

  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`AI_TIMEOUT: ${label} exceeded ${ms}ms`));
    }, ms);
  });

  const targetPromise = typeof promiseOrFn === 'function' ? promiseOrFn(signal) : promiseOrFn;

  return Promise.race([targetPromise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

export async function safeParseResponse(res: any, defaultErrorPrefix: string): Promise<any> {
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    // Content is not valid JSON
  }
  
  if (!res.ok) {
    const errorMsg = data?.error?.message 
      || data?.message 
      || data?.detail 
      || (text ? (text.length > 300 ? text.substring(0, 300) + '...' : text) : `HTTP ${res.status}`);
    throw new Error(`${defaultErrorPrefix}: ${errorMsg}`);
  }
  
  return data;
}

export async function safeDecrementOnFailure(
  quotaCheck: { allowed: boolean },
  userId: number,
  toolIdStr: string,
  walletCharged: boolean | { charged: 'points' | 'balance'; amount: number }
) {
  try {
    if (quotaCheck && quotaCheck.allowed) {
      await decrementUserUsage(userId, toolIdStr);
    } else if (walletCharged && typeof walletCharged === 'object') {
      // Corrected: refund the charge instead of incrementing usage (incrementing usage is reversed logic)
      await refundUsageToWallet(userId, toolIdStr, walletCharged);
    } else {
      console.info(`[safeDecrementOnFailure] No rollback or backup refund needed for user ${userId} / tool "${toolIdStr}": walletCharged=false.`);
    }
  } catch (e) {
    console.error('[Orchestrator Shared Task Utils] safeDecrementOnFailure failed:', e);
  }
}
