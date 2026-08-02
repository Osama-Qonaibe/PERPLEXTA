/**
 * Unified Image URL Resolution Service for Perplexta Platform
 * Single source of truth for all image URL formatting.
 */

import { getAssetUrl } from './assetManager';

export function getImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || url.trim() === '') return '';
  
  const trimmed = url.trim();

  // If already full URL or data/blob, return as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return getAssetUrl(trimmed);
  }

  // Handle paths that already start with /uploads/
  if (trimmed.startsWith('/uploads/')) {
    return getAssetUrl(trimmed);
  }

  // Handle paths that start with uploads/
  if (trimmed.startsWith('uploads/')) {
    return getAssetUrl(`/${trimmed}`);
  }

  // Default: prepend /uploads/
  return getAssetUrl(`/uploads/${trimmed}`);
}
