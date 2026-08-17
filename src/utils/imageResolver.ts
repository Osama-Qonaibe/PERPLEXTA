/**
 * Centralized Image and Avatar Resolver Utility for Perplexta Platform
 * Ensures single source of truth, prevents stale cache issues on page reload,
 * and provides robust fallbacks for avatars and platform media.
 */

import { getAssetUrl } from './assetManager';
import { getMediaUrl } from './mediaUtils';

export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
export const DEFAULT_COVER = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

export function resolveImageUrl(url?: string | null, type: 'avatar' | 'cover' | 'general' = 'general', forceBust = false): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    if (type === 'avatar') return DEFAULT_AVATAR;
    if (type === 'cover') return DEFAULT_COVER;
    return '';
  }

  const resolved = getMediaUrl(url);
  if (!resolved) {
    if (type === 'avatar') return DEFAULT_AVATAR;
    if (type === 'cover') return DEFAULT_COVER;
    return '';
  }

  return resolved;
}
