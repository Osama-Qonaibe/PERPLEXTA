import { decrementUserUsage } from '../quota.js';
import { refundUsageToWallet } from '../wallet.js';

export const AI_CALL_TIMEOUT_MS = 90000;

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
