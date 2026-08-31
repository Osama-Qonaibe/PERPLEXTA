import path from 'path';

export const filePermissionCache = new Map<string, { authorized: boolean; expiresAt: number }>();
export const fileVersionCache = new Map<string, { version: number; expiresAt: number }>();
export const FILE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL Cache

export function invalidateFilePermissionCache(filename?: string) {
  console.log('[FilePermissionCache] invalidateFilePermissionCache called with filename:', filename);
  if (filename) {
    const cleanName = path.basename(filename.split('?')[0]);
    filePermissionCache.delete(`public_ref:${cleanName}`);
  } else {
    filePermissionCache.clear();
  }
}

export function invalidateFileVersionCache(filename?: string) {
  if (filename) {
    const cleanName = path.basename(filename.split('?')[0]);
    fileVersionCache.delete(cleanName);
  } else {
    fileVersionCache.clear();
  }
}
