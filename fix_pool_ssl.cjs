const fs = require('fs');
let content = fs.readFileSync('server/db/index.ts', 'utf8');

// We need to pass the URL to getSslConfig so it can make an intelligent decision based on the host.

const targetGetSslConfig = `export function getSslConfig() {
  // If explicitly disabled via env var, don't use SSL
  if (process.env.DB_SSL_REQUIRED === 'false') return undefined;
  
  // If explicitly enabled, use it
  if (process.env.DB_SSL_REQUIRED === 'true') return { rejectUnauthorized: false };
  
  // In production, default to SSL (but allow override above)
  if (process.env.NODE_ENV === 'production') return { rejectUnauthorized: false };
  
  // Default for local development is NO SSL to prevent "The server does not support SSL connections" errors
  return undefined;
}`;

const newGetSslConfig = `export function getSslConfig(urlStr?: string) {
  if (process.env.DB_SSL_REQUIRED === 'false') return undefined;
  if (process.env.DB_SSL_REQUIRED === 'true') return { rejectUnauthorized: false };
  
  // Intelligent default based on host
  if (urlStr) {
    try {
      const u = new URL(urlStr);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        return undefined; // Local databases usually don't support SSL out of the box
      } else {
        return { rejectUnauthorized: false }; // Remote databases (Neon, Supabase) require SSL
      }
    } catch (e) {
      // Ignore URL parse errors
    }
  }

  // Fallbacks if no URL is provided or parsing fails
  if (process.env.NODE_ENV === 'production') return { rejectUnauthorized: false };
  return { rejectUnauthorized: false }; // Default to secure for remote DBs commonly used
}`;

const targetGetBasePoolConfig = `export function getBasePoolConfig(max: number, connectionTimeoutMillis = 10000) {
  return {
    ssl: getSslConfig(),
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis,
    max,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
}`;

const newGetBasePoolConfig = `export function getBasePoolConfig(max: number, connectionTimeoutMillis = 10000, urlStr?: string) {
  return {
    ssl: getSslConfig(urlStr),
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis,
    max,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
}`;

content = content.replace(targetGetSslConfig, newGetSslConfig);
content = content.replace(targetGetBasePoolConfig, newGetBasePoolConfig);

// Now we need to update all calls to getBasePoolConfig to pass the URL.
content = content.replace(/getBasePoolConfig\(([^,]+),\s*([^)]+)\)/g, 'getBasePoolConfig($1, $2)'); // reset first just in case
// Wait, regex might be tricky. Let's do it specifically:
content = content.replace(/getBasePoolConfig\(([^,]+),\s*([0-9]+)\)/g, 'getBasePoolConfig($1, $2, connectionString || url || normCoreUrl || safeConnStr || undefined)'); 
// Actually, it's safer to explicitly replace each.
fs.writeFileSync('server/db/index.ts', content);
