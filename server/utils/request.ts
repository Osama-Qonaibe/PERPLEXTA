import type { Request } from 'express';

/** Languages supported by the auth.md / well-known content generator. */
export type SupportedLang = 'ar' | 'en' | 'fr' | 'es' | 'de';

const SUPPORTED_LANGS: SupportedLang[] = ['ar', 'en', 'fr', 'es', 'de'];

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

/**
 * Detect the preferred language from the Accept-Language header.
 * Falls back to 'en' if no supported language is found.
 */
export function getPreferredLanguage(req: Request): SupportedLang {
  const header = req.get('accept-language') || '';
  // Parse "ar,en-US;q=0.9,fr;q=0.8" into ordered language codes
  const candidates = header
    .split(',')
    .map(part => {
      const [tag, q] = part.trim().split(';q=');
      return { lang: tag.trim().split('-')[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q)
    .map(c => c.lang);

  for (const lang of candidates) {
    if (SUPPORTED_LANGS.includes(lang as SupportedLang)) {
      return lang as SupportedLang;
    }
  }
  return 'en';
}
