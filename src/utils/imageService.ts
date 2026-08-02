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
    return trimmed;
  }

  // Ensure absolute path from root
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  
  // Return absolute URL relative to domain
  return getAssetUrl(path);
}
