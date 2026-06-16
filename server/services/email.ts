import nodemailer from 'nodemailer';
import { pool } from '../db/index.js';
import { systemTemplates } from '../config/templates.js';

export async function sendEmail(to: string, subject: string, html: string, adminId: number | null = null) {
  try {
    const settings = await pool.query('SELECT * FROM email_settings LIMIT 1');
    if (settings.rows.length === 0) {
      throw new Error('Email SMTP settings are not configured in the admin panel.');
    }

    const s = settings.rows[0];
    if (!s.smtp_host || !s.smtp_port) {
      throw new Error('SMTP Host or Port is not specified in settings.');
    }

    const isSSL = s.smtp_encryption === 'ssl';
    const transporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: parseInt(s.smtp_port || '587'),
      secure: isSSL,
      auth: { 
        user: s.smtp_username || '', 
        pass: s.smtp_password || '' 
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000
    });

    const info = await transporter.sendMail({
      from: `"${s.sender_name || 'Perplexta'}" <${s.sender_email || 'noreply@perplexta.com'}>`,
      to,
      subject,
      html
    });

    await pool.query(
      `INSERT INTO system_logs (user_id, action, type, details) VALUES ($1, $2, $3, $4)`,
      [
        adminId,
        'Send Outgoing Email',
        'communication',
        JSON.stringify({
          to,
          subject,
          messageId: info.messageId,
          status: 'success',
          sender: s.sender_email,
          timestamp: new Date().toISOString()
        })
      ]
    ).catch((logErr: any) => console.error('[Email Log] DB logging failed on success:', logErr));

    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    const errMsg = error?.message || '';
    if (errMsg.includes('are not configured') || errMsg.includes('not specified in settings')) {
      console.warn('[Email] Outgoing email skipped (SMTP is not fully configured):', to);
    } else {
      console.warn('[Email] Failed to send email to:', to, 'Error:', error);
    }

    await pool.query(
      `INSERT INTO system_logs (user_id, action, type, details) VALUES ($1, $2, $3, $4)`,
      [
        adminId,
        'Send Outgoing Email Failed',
        'communication',
        JSON.stringify({
          to,
          subject,
          status: 'failed',
          error: error.message || 'Unknown SMTP error',
          timestamp: new Date().toISOString()
        })
      ]
    ).catch((logErr: any) => console.error('[Email Log] DB logging failed on fallback error:', logErr));

    return { success: false, error: error.message || 'Unknown email transfer error.' };
  }
}

export const sendSmartEmail = async (userId: number | null, toEmail: string, templateName: string, variables: Record<string, string>, language: 'en' | 'ar' = 'en') => {
  try {
    const settings = await pool.query('SELECT * FROM email_settings LIMIT 1');
    if (settings.rows.length === 0) return false;

    const templateRes = await pool.query('SELECT * FROM email_templates WHERE name = $1', [templateName]);
    if (templateRes.rows.length === 0) return false;

    const template = templateRes.rows[0];
    let subject = language === 'ar' ? template.subject_ar : template.subject_en;
    let body = language === 'ar' ? template.body_ar : template.body_en;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    });

    const result = await sendEmail(toEmail, subject, body, userId);
    return result.success;
  } catch (error) {
    console.warn('[Email] Smart email failed:', error);
    return false;
  }
};

export async function syncSystemTemplates() {
  try {
    for (const template of systemTemplates) {
      await pool.query(`
        INSERT INTO email_templates (name, subject_en, subject_ar, body_en, body_ar)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO UPDATE SET
          subject_en = EXCLUDED.subject_en,
          subject_ar = EXCLUDED.subject_ar,
          body_en = EXCLUDED.body_en,
          body_ar = EXCLUDED.body_ar
      `, [template.name, template.subject_en, template.subject_ar, template.body_en, template.body_ar]);
    }
    console.log('[Email] System templates synchronized.');
  } catch (error) {
    console.error('[Email] Template sync failed:', error);
  }
}
