import path from 'path';

export const filePermissionCache = new Map<string, { authorized: boolean; expiresAt: number }>();
export const FILE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL Cache

export function invalidateFilePermissionCache(filename?: string) {
  if (filename) {
    const cleanName = path.basename(filename.split('?')[0]);
    filePermissionCache.delete(`public_ref:${cleanName}`);
  } else {
    filePermissionCache.clear();
  }
}
