/**
 * Centralized Image and Avatar Resolver Utility for Perplexta Platform
 * Ensures single source of truth, prevents stale cache issues on page reload,
 * and provides robust fallbacks for avatars and platform media.
 */

import { BUILD_VERSION, getAssetUrl } from './assetManager';

export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
export const DEFAULT_COVER = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

export function resolveImageUrl(url?: string | null, type: 'avatar' | 'cover' | 'general' = 'general', forceBust = false): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    if (type === 'avatar') return DEFAULT_AVATAR;
    if (type === 'cover') return DEFAULT_COVER;
    return DEFAULT_AVATAR;
  }

  const trimmed = url.trim();
  let resolved = trimmed;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    resolved = trimmed;
  } else if (trimmed.startsWith('/uploads/')) {
    resolved = trimmed;
  } else if (trimmed.startsWith('uploads/')) {
    resolved = `/${trimmed}`;
  } else if (trimmed.startsWith('/')) {
    resolved = trimmed;
  } else {
    resolved = `/uploads/${trimmed}`;
  }

  // Use assetManager getAssetUrl for consistent cache-busting versioning across refreshes
  return getAssetUrl(resolved);
}
