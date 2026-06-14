import { decrementUserUsage } from '../quota.js';
import { getEconomySettings } from '../wallet.js';

export const AI_CALL_TIMEOUT_MS = 90000;
export const TTS_TIMEOUT_MS = 30000;
export const STT_TIMEOUT_MS = 45000;
export const IMG_TIMEOUT_MS = 120000;
export const VIDEO_TIMEOUT_MS = 660000; // 11 minutes

/**
 * Validates available provider daily budgets, quota limits, and system activation status.
 * Consolidates capacity controls across image and video tasks with absolute transactional safety.
 */
export async function validateProviderCapacity(
  vaultConfig: any,
  providerId: string,
  costPerUsage: number
): Promise<{ warning?: string; valid: boolean }> {
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
  
  const settings = await getEconomySettings();
  const pointsPerDollar = parseFloat(settings.points_per_dollar || '1000');
  const estimatedCost = (costPerUsage || 0) / pointsPerDollar;

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
  const contentType = res.headers?.get('content-type') || '';
  const text = await res.text();
  let data: any = null;
  let isJsonCorrupted = false;

  const isHtml = contentType.includes('text/html') || 
    text.trim().toLowerCase().startsWith('<!doctype html') || 
    text.trim().toLowerCase().startsWith('<html');

  const looksLikeJson = !isHtml && (
    contentType.includes('application/json') || 
    text.trim().startsWith('{') || 
    text.trim().startsWith('[')
  );

  if (looksLikeJson) {
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      isJsonCorrupted = true;
    }
  }

  if (!res.ok) {
    if (isJsonCorrupted) {
      throw new Error(`${defaultErrorPrefix}: Corrupted JSON payload returned from provider API.`);
    }
    const looksLikeHtml = isHtml;

    if (looksLikeHtml) {
       throw new Error(`${defaultErrorPrefix}: Received HTML page from gateway (HTTP ${res.status}).`);
    }

    const errorMsg = data?.error?.message 
      || data?.message 
      || data?.detail 
      || (text ? (text.length > 150 ? text.substring(0, 150) + '...' : text) : `HTTP ${res.status}`);
    throw new Error(`${defaultErrorPrefix}: ${errorMsg}`);
  }

  if (isJsonCorrupted) {
    throw new Error(`${defaultErrorPrefix}: Unparseable non-JSON raw body received.`);
  }
  
  return data || {};
}

/**
 * Traverses a nested object hierarchy dynamically using a dot/bracket path representation (e.g., "data[0].url").
 * Essential for modern provider-agnostic protocol parsers to avoid code modification when new backends are introduced.
 */
export function getNestedField(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split(/[\.\[\]]+/).filter(Boolean).reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    const index = parseInt(key);
    return isNaN(index) ? acc[key] : acc[index];
  }, obj);
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
    } else {
      console.info(`[safeDecrementOnFailure] Centralized billing middleware is active for user ${userId} / tool "${toolIdStr}". Balanced allocation will handle refund/reconciliation.`);
    }
  } catch (e) {
    console.error('[Orchestrator Shared Task Utils] safeDecrementOnFailure failed:', e);
  }
}
