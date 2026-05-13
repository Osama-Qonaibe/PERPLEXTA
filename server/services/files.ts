import { pool } from '../db/index.js';

export async function getUserFiles(userId: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query('SELECT * FROM user_files WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return result.rows;
}

export async function saveFileMetadata(userId: string, data: {
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  file_type: string;
  metadata: any;
}) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query(
    `INSERT INTO user_files (user_id, file_name, file_url, file_size, mime_type, file_type, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [userId, data.file_name, data.file_url, data.file_size, data.mime_type, data.file_type, JSON.stringify(data.metadata)]
  );
  return result.rows[0];
}

export async function getUserStorageUsage(userId: string): Promise<number> {
  if (!pool) return 0;
  const result = await pool.query('SELECT SUM(file_size) as total FROM user_files WHERE user_id = $1', [userId]);
  return parseInt(result.rows[0].total || '0');
}
