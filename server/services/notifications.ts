import { pool } from '../db/index.js';
import { io } from '../config/socket.js';

export async function createNotification(userId: number, type: string, titleEn: string, titleAr: string, messageEn: string, messageAr: string, metadata: any = {}) {
  try {
    const res = await pool.query(`
      INSERT INTO notifications (user_id, type, title_en, title_ar, message_en, message_ar, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [userId, type, titleEn, titleAr, messageEn, messageAr, JSON.stringify(metadata)]);

    if (io) {
      io.to(`user_${userId}`).emit('notification', res.rows[0]);
    }
    return res.rows[0];
  } catch (error) {
    console.error('[Notification] Create failed:', error);
  }
}

export async function logSecurityAlert(userId: number | null, alertType: string, severity: string, description: string, metadata: any = {}, req?: any) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    await pool.query(`
      INSERT INTO security_alerts (user_id, alert_type, severity, description, metadata, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, alertType, severity, description, JSON.stringify(metadata), ip]);
  } catch (err) {
    console.error('[SecurityLog] Failed:', err);
  }
}

export async function logSystemActivity(userId: number | null, action: string, description: string, metadata: any = {}, req?: any) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    await pool.query(`
      INSERT INTO system_logs (user_id, action, description, metadata, ip_address)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, action, description, JSON.stringify(metadata), ip]);
  } catch (err) {
    console.error('[SystemLog] Failed:', err);
  }
}
