import type express from 'express';

const HOST_REGEX = /^[a-zA-Z0-9.-]+(:\d+)?$/;

function sanitizeHost(raw: string, fallback: string): string {
  const clean = (raw || '').split(',')[0].trim();
  return HOST_REGEX.test(clean) ? clean : fallback;
}

/**
 * Derives the canonical base URL from the incoming request.
 * Priority:
 *   1. VITE_APP_URL / APP_URL env vars (production override)
 *   2. X-Forwarded-Proto + X-Forwarded-Host (reverse proxy)
 *   3. req.protocol + Host header (direct)
 */
export function getBaseUrl(req: express.Request): string {
  const envUrl = process.env.VITE_APP_URL || process.env.APP_URL;
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/$/, '');
  }

  const protocol =
    (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const rawHost =
    (req.headers['x-forwarded-host'] as string) ||
    (req.headers['host'] as string) ||
    'localhost:3000';

  const host = sanitizeHost(rawHost, 'localhost:3000');
  return `${protocol}://${host}`;
}

/**
 * Builds the Google OAuth callback URI from the canonical base URL.
 */
export function getRedirectUri(req: express.Request): string {
  return `${getBaseUrl(req)}/api/auth/google/callback`;
}

const SUPPORTED_LANGUAGES = ['ar', 'en', 'fr', 'es', 'de'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Resolves the best-matching supported language from the
 * Accept-Language request header. Defaults to Arabic ('ar').
 */
export function getPreferredLanguage(req: express.Request): SupportedLang {
  const acceptLang = req.headers['accept-language'];
  if (!acceptLang) return 'ar';

  const parsed = acceptLang
    .split(',')
    .map(part => {
      const [langRaw, qRaw] = part.split(';');
      const code = langRaw.trim().toLowerCase().split('-')[0] as SupportedLang;
      const q = qRaw ? parseFloat(qRaw.replace('q=', '')) || 1.0 : 1.0;
      return { code, q };
    })
    .filter(item => (SUPPORTED_LANGUAGES as readonly string[]).includes(item.code))
    .sort((a, b) => b.q - a.q);

  if (parsed.length > 0) return parsed[0].code;

  const lower = acceptLang.toLowerCase();
  return SUPPORTED_LANGUAGES.find(l => lower.includes(l)) ?? 'ar';
}
