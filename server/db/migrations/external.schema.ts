import type { QueryClient } from './types.js';

export const EXTERNAL_SCHEMA_TABLES: { name: string; query: string }[] = [];

export async function applyExternalColumnEnforcements(targetExternalPool: QueryClient) {
  if (!targetExternalPool) return;
  try {
    // Clean up legacy blog tables if they exist on the external database pool
    await targetExternalPool.query(`
      DROP TABLE IF EXISTS blog_ratings CASCADE;
      DROP TABLE IF EXISTS blog_comments CASCADE;
      DROP TABLE IF EXISTS blog_articles CASCADE;
    `).catch(() => {});
  } catch {
    // Ignore cleanup errors on disconnected pool
  }
}

export const EXTERNAL_INDEXES: string[] = [];
