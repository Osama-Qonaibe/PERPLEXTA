import { decrementUserUsage, incrementUserUsage } from '../quota.js';

export const AI_CALL_TIMEOUT_MS = 90000;

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`AI_TIMEOUT: ${label} exceeded ${ms}ms`)), ms)
    )
  ]);
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

export async function safeDecrementOnFailure(quotaCheck: { allowed: boolean }, userId: number, toolIdStr: string, walletCharged: boolean) {
  try {
    if (quotaCheck.allowed) {
      await decrementUserUsage(userId, toolIdStr);
    } else if (walletCharged) {
      await incrementUserUsage(userId, toolIdStr);
    }
  } catch (e) {
    console.error('[Orchestrator Shared Task Utils] safeDecrementOnFailure failed:', e);
  }
}
