import nodemailer from 'nodemailer';
import { pool } from '../db/index.js';
import { systemTemplates } from '../../src/lib/templates.js';

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const settings = await pool.query('SELECT * FROM email_settings LIMIT 1');
    if (settings.rows.length === 0) throw new Error('Email settings not configured.');

    const s = settings.rows[0];
    const transporter = nodemailer.createTransport({
      host: s.smtp_host,
      port: s.smtp_port,
      secure: s.smtp_encryption === 'ssl', // Note: logic might be more complex in original
      auth: { user: s.smtp_username, pass: s.smtp_password }
    });

    await transporter.sendMail({
      from: `"${s.sender_name}" <${s.sender_email}>`,
      to,
      subject,
      html
    });

    return true;
  } catch (error) {
    console.error('[Email] Failed to send email:', error);
    return false;
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

    return await sendEmail(toEmail, subject, body);
  } catch (error) {
    console.error('[Email] Smart email failed:', error);
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
