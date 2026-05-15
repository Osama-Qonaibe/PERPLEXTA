import { pool } from '../db/index.js';

/**
 * Centeralized Audit Logging for SOVEREIGN SYSTEM
 * Tracks all administrative and critical system actions.
 */
export async function auditLog(userId: any, action: string, type: string, details: object) {
  try {
    await pool.query(
      'INSERT INTO system_logs (user_id, action, type, details) VALUES ($1, $2, $3, $4)',
      [userId, action, type, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('[AuditLog Error]', error);
  }
}
