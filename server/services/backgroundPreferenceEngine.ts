import { pool } from '../db/index.js';

const preferenceCache = new Map<number, { prefs: any; timestamp: number }>();
const CACHE_TTL = 60000;

export async function getUserPreferencesProgrammatic(userId: string | number): Promise<any> {
  if (!pool) throw new Error('Database initializing');
  const cleanId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  
  const cached = preferenceCache.get(cleanId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.prefs;
  }

  const res = await pool.query(
    'SELECT language, theme, memory, custom_instructions, email_notifications FROM users WHERE id = $1',
    [cleanId]
  );

  if (res.rows.length === 0) return null;

  const prefs = res.rows[0];
  preferenceCache.set(cleanId, { prefs, timestamp: Date.now() });
  return prefs;
}

export async function updateUserPreferencesProgrammatic(userId: string | number, updates: {
  language?: string;
  theme?: string;
  memory?: string;
  custom_instructions?: string;
  email_notifications?: boolean;
}): Promise<any> {
  if (!pool) throw new Error('Database initializing');
  const cleanId = typeof userId === 'string' ? parseInt(userId, 10) : userId;

  const current = await getUserPreferencesProgrammatic(cleanId) || {};
  const merged = { ...current, ...updates };

  const res = await pool.query(
    `UPDATE users 
     SET language = COALESCE($1, language),
         theme = COALESCE($2, theme),
         memory = COALESCE(CAST($3 AS TEXT), memory),
         custom_instructions = COALESCE($4, custom_instructions),
         email_notifications = COALESCE(CAST($5 AS BOOLEAN), email_notifications),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING language, theme, memory, custom_instructions, email_notifications`,
    [
      merged.language,
      merged.theme,
      merged.memory,
      merged.custom_instructions,
      merged.email_notifications,
      cleanId
    ]
  );

  preferenceCache.delete(cleanId);
  return res.rows[0];
}

export async function getChatContextStateProgrammatic(chatId: string | number, userId: string | number): Promise<any> {
  if (!pool) throw new Error('Database initializing');
  const cleanChatId = typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;
  const cleanUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;

  const res = await pool.query(
    'SELECT id, title, tool_id, context_summary, updated_at FROM chats WHERE id = $1 AND user_id = $2',
    [cleanChatId, cleanUserId]
  );

  if (res.rows.length === 0) return null;
  return res.rows[0];
}
