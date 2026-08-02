/**
 * Perplexta Asset Manager & Version Hash Utility
 * Generates and tracks build-version hashes to prevent stale asset caching
 * across page refreshes and updates.
 */

export const BUILD_VERSION = typeof window !== 'undefined' 
  ? (window as any).__PERPLEXTA_BUILD_VERSION__ || '2026-08-02-v2.0'
  : '2026-08-02-v2.0';

export function getAssetUrl(path?: string | null): string {
  if (!path) return '';
  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    // If it's an external URL, return as is or add version if internal
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const separator = cleanPath.includes('?') ? '&' : '?';
  
  if (cleanPath.includes('v=')) {
    return cleanPath;
  }

  return `${cleanPath}${separator}v=${BUILD_VERSION}`;
}
