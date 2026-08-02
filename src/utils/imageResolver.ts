import { getAssetUrl } from './assetManager';

export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
export const DEFAULT_COVER = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';

export function resolveImageUrl(url?: string | null, type: 'avatar' | 'cover' | 'general' = 'general', forceBust = false): string {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return type === 'avatar' ? DEFAULT_AVATAR : type === 'cover' ? DEFAULT_COVER : DEFAULT_AVATAR;
  }

  const trimmed = url.trim();

  if (trimmed.startsWith('blob:')) {
    return type === 'avatar' ? DEFAULT_AVATAR : type === 'cover' ? DEFAULT_COVER : DEFAULT_AVATAR;
  }

  let resolved = trimmed;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
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

  return getAssetUrl(resolved);
}
