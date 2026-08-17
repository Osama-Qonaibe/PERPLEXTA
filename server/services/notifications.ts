import { pool, getSecurityPool } from '../db/index.js';
import { io } from '../config/socket.js';

export async function dispatchNotification(
  userIdOrIds: number | string | (number | string)[],
  type: string,
  titleEn: string,
  titleAr: string,
  messageEn: string,
  messageAr: string,
  metadata: any = {},
  options?: { 
    sendEmail?: boolean; 
    emailBody?: string | ((user: any) => string); 
    emailBodyAr?: string | ((user: any) => string); 
    adminId?: number | null 
  }
) {
  try {
    const userIds = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds];
    if (userIds.length === 0) return;

    // 1. Single database query to check user preference flags and fetch email settings for all recipients
    const userRes = await pool.query(
      `SELECT 
         u.id, u.email, u.language, u.status as user_status, u.email_notifications, u.name,
         e.smtp_host, e.smtp_port, e.smtp_encryption, e.smtp_username, e.smtp_password, e.sender_name, e.sender_email, e.status as email_settings_status
       FROM users u
       LEFT JOIN email_settings e ON true
       WHERE u.id = ANY($1)`,
      [userIds]
    );

    if (userRes.rows.length === 0) return;
    const users = userRes.rows;

    // 2. Dispatch notifications and emails
    for (const user of users) {
      await createNotification(user.id, type, titleEn, titleAr, messageEn, messageAr, metadata);

      if (options?.sendEmail && user.email_notifications && user.user_status === 'active') {
        const { sendEmail } = await import('./email.js');
        const subject = user.language === 'ar' ? titleAr : titleEn;
        
        let body = '';
        if (user.language === 'ar' && options.emailBodyAr) {
          body = typeof options.emailBodyAr === 'function' ? options.emailBodyAr(user) : options.emailBodyAr;
        } else if (options.emailBody) {
          body = typeof options.emailBody === 'function' ? options.emailBody(user) : options.emailBody;
        }

        if (body) {
          const emailSettings = {
            smtp_host: user.smtp_host,
            smtp_port: user.smtp_port,
            smtp_encryption: user.smtp_encryption,
            smtp_username: user.smtp_username,
            smtp_password: user.smtp_password,
            sender_name: user.sender_name,
            sender_email: user.sender_email
          };
          if (!emailSettings.smtp_host) {
            console.warn('[Email] Outgoing email skipped (SMTP is not configured in DB).');
            continue;
          }
          await sendEmail(user.email, subject, body, options.adminId, emailSettings);
        }
      }
    }
  } catch (error) {
    console.error('[Notification] Dispatch failed:', error);
  }
}

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
  const result = await pool.query(
    'SELECT id, user_id, type, title_en, title_ar, message_en, message_ar, is_read, metadata, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', 
    [userId]
  );
  return result.rows;
}

export async function markNotificationsAsRead(userId: string | number) {
  await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [userId]);
  return { success: true };
}

export async function markSingleNotificationAsRead(id: string | number, userId: string | number) {
  await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 AND is_read = false', [id, userId]);
  return { success: true };
}

export async function clearAllUserNotifications(userId: string | number) {
  await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
  return { success: true };
}

export async function deleteSingleNotification(id: string | number, userId: string | number) {
  await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);
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

let cachedSysLogColumns: string[] | null = null;
async function getSysLogColumns(): Promise<string[]> {
  if (cachedSysLogColumns) return cachedSysLogColumns;
  try {
    if (!pool) return ['user_id', 'action', 'type', 'description', 'metadata', 'details', 'ip_address'];
    const res = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'system_logs'
    `);
    const cols = res.rows.map((r: any) => r.column_name);
    cachedSysLogColumns = cols;
    return cols;
  } catch {
    return ['user_id', 'action', 'type', 'description', 'metadata', 'details', 'ip_address'];
  }
}

export async function logSystemActivity(userId: number | null, action: string, description: string, metadata: any = {}, req?: any) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null) : null;
    const metaStr = typeof metadata === 'string' ? metadata : JSON.stringify(metadata || {});
    const columns = await getSysLogColumns();

    const fields: string[] = [];
    const values: any[] = [];

    if (columns.includes('user_id')) {
      fields.push('user_id');
      values.push(userId);
    }
    if (columns.includes('action')) {
      fields.push('action');
      values.push(action);
    }
    if (columns.includes('type')) {
      fields.push('type');
      values.push(action);
    }
    if (columns.includes('description')) {
      fields.push('description');
      values.push(description);
    }
    if (columns.includes('details')) {
      fields.push('details');
      values.push(metaStr);
    }
    if (columns.includes('metadata')) {
      fields.push('metadata');
      values.push(metaStr);
    }
    if (columns.includes('ip_address')) {
      fields.push('ip_address');
      values.push(ip);
    }

    if (fields.length === 0) return;

    const placeholders = fields.map((_, idx) => `$${idx + 1}`).join(', ');
    await pool.query(`
      INSERT INTO system_logs (${fields.join(', ')})
      VALUES (${placeholders})
    `, values);
  } catch (err) {
    console.error('[SystemLog] Failed:', err);
  }
}
