import type express from 'express';

/**
 * Derives the canonical base URL from the incoming request,
 * respecting X-Forwarded-Proto and X-Forwarded-Host set by
 * reverse proxies / load balancers.
 */
export function getBaseUrl(req: express.Request): string {
  const protocol =
    req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = (
    (req.headers['x-forwarded-host'] as string) ||
    req.headers.host ||
    'perplexta.com'
  ).replace(/:\d+$/, '');
  return `${protocol}://${host}`;
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

  // Substring fallback for headers like "en-GB, ar"
  const lower = acceptLang.toLowerCase();
  return SUPPORTED_LANGUAGES.find(l => lower.includes(l)) ?? 'ar';
}
