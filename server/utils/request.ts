import type { Request } from 'express';

/**
 * Derive the canonical origin (scheme + host) from an incoming request.
 * Respects VITE_APP_URL / APP_URL env vars and X-Forwarded-* headers.
 */
export const getBaseUrl = (req: Request): string => {
  const envUrl = process.env.VITE_APP_URL || process.env.APP_URL;
  if (
    envUrl &&
    envUrl.startsWith('http') &&
    !envUrl.includes('localhost') &&
    !envUrl.includes('127.0.0.1')
  ) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  const xProto = req.get('x-forwarded-proto');
  const xHost  = req.get('x-forwarded-host');
  const host   = req.get('host');

  const finalHost = xHost || host;
  let protocol    = xProto || req.protocol;

  if (
    finalHost &&
    !finalHost.includes('localhost') &&
    !finalHost.includes('127.0.0.1') &&
    !finalHost.includes('0.0.0.0')
  ) {
    protocol = 'https';
  }

  const origin = `${protocol}://${finalHost}`;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

/** Full redirect URI used for Google OAuth callbacks. */
export const getRedirectUri = (req: Request): string =>
  `${getBaseUrl(req)}/api/auth/google/callback`;
