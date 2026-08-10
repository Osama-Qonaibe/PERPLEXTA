const fs = require('fs');

let cacheContent = fs.readFileSync('server/services/filePermissionCache.ts', 'utf8');

cacheContent = cacheContent.replace(
  /export function invalidateFilePermissionCache\(filename\?: string\) \{/,
  "export function invalidateFilePermissionCache(filename?: string) {\n  console.log('[FilePermissionCache] invalidateFilePermissionCache called with filename:', filename);"
);
fs.writeFileSync('server/services/filePermissionCache.ts', cacheContent);

let appContent = fs.readFileSync('server/app.ts', 'utf8');

const oldCheck = 'async function checkIsPublicFile(filename: string): Promise<boolean> {';
const newCheck = "async function checkIsPublicFile(filename: string): Promise<boolean> {\n  console.log('[checkIsPublicFile] Checking file:', filename);";
appContent = appContent.replace(oldCheck, newCheck);

const oldCacheCheck = `  if (filePermissionCache.has(cacheKey)) {
    const cached = filePermissionCache.get(cacheKey)!;
    if (now < cached.expiresAt && cached.authorized) return true;
    filePermissionCache.delete(cacheKey);
  }`;
const newCacheCheck = `  if (filePermissionCache.has(cacheKey)) {
    const cached = filePermissionCache.get(cacheKey)!;
    if (now < cached.expiresAt && cached.authorized) {
      console.log('[checkIsPublicFile] Cache hit, authorized:', cacheKey);
      return true;
    }
    console.log('[checkIsPublicFile] Cache expired or not authorized, deleting:', cacheKey);
    filePermissionCache.delete(cacheKey);
  }`;
appContent = appContent.replace(oldCacheCheck, newCacheCheck);

const oldDbChecks = `    if (fileCheck.rows.length > 0) {
      const row = fileCheck.rows[0];`;
const newDbChecks = `    if (fileCheck.rows.length > 0) {
      console.log('[checkIsPublicFile] Found file in user_files:', cleanName);
      const row = fileCheck.rows[0];`;
appContent = appContent.replace(oldDbChecks, newDbChecks);

const oldCombined = `      if (combinedCheck.rows[0]?.is_public) {
        isPublic = true;
      }`;
const newCombined = `      if (combinedCheck.rows[0]?.is_public) {
        console.log('[checkIsPublicFile] Found file in public tables (e.g. system_settings):', cleanName);
        isPublic = true;
      } else {
        console.log('[checkIsPublicFile] File not found in any public tables:', cleanName);
      }`;
appContent = appContent.replace(oldCombined, newCombined);

fs.writeFileSync('server/app.ts', appContent);
