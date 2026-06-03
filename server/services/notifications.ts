import { pool, getSecurityPool } from '../db/index.js';
import { io } from '../config/socket.js';

export async function createNotification(userId: number | string, type: string, titleEn: string, titleAr: string, messageEn: string, messageAr: string, metadata: any = {}) {
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

export async function getUserNotifications(userId: string | number) {
  const result = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]);
  return result.rows;
}

export async function markNotificationsAsRead(userId: string | number) {
  await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
  return { success: true };
}

let cachedSecAlertColumns: string[] | null = null;
async function getSecAlertColumns(): Promise<string[]> {
  if (cachedSecAlertColumns) return cachedSecAlertColumns;
  try {
    const poolInstance = getSecurityPool();
    if (!poolInstance) return ['type', 'severity', 'description', 'metadata', 'ip_address'];
    const res = await poolInstance.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'security_alerts'
    `);
    const cols = res.rows.map((r: any) => r.column_name);
    cachedSecAlertColumns = cols;
    return cols;
  } catch (err) {
    console.warn('[SecurityLog] Failed to fetch column description, defaulting to standard columns:', err);
    return ['type', 'severity', 'description', 'metadata', 'ip_address'];
  }
}

export async function logSecurityAlert(userId: number | null, alertType: string, severity: string, description: string, metadata: any = {}, req?: any) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    const columns = await getSecAlertColumns();
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (columns.includes('user_id')) {
      fields.push('user_id');
      values.push(userId);
    }
    
    if (columns.includes('type')) {
      fields.push('type');
      values.push(alertType);
    }
    if (columns.includes('alert_type')) {
      fields.push('alert_type');
      values.push(alertType);
    }
    
    if (columns.includes('severity')) {
      fields.push('severity');
      values.push(severity);
    }
    
    if (columns.includes('description')) {
      fields.push('description');
      values.push(description);
    } else if (columns.includes('details')) {
      fields.push('details');
      values.push(description);
    }
    
    if (columns.includes('message')) {
      fields.push('message');
      values.push(description);
    }
    
    if (columns.includes('metadata')) {
      fields.push('metadata');
      values.push(JSON.stringify(metadata));
    }
    
    if (columns.includes('ip_address')) {
      fields.push('ip_address');
      values.push(ip);
    }
    
    if (fields.length === 0) return;
    
    const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(', ');
    const query = `
      INSERT INTO security_alerts (${fields.join(', ')})
      VALUES (${placeholders})
    `;
    
    await getSecurityPool().query(query, values);
  } catch (err) {
    console.error('[SecurityLog] Failed:', err);
  }
}

export async function logSystemActivity(userId: number | null, action: string, description: string, metadata: any = {}, req?: any) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    await pool.query(`
      INSERT INTO system_logs (user_id, action, type, description, metadata, ip_address)
      VALUES ($1, $2, $2, $3, $4, $5)
    `, [userId, action, description, JSON.stringify(metadata), ip]);
  } catch (err) {
    console.error('[SystemLog] Failed:', err);
  }
}
