import express from 'express';
import nodemailer from 'nodemailer';
import { pool } from '../db/index.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { syncSystemTemplates } from '../services/email.js';

const router = express.Router();

// GET /api/mail-services-v3/config
router.get('/config', authenticateAdmin, async (req, res) => {
  try {
    const check = await pool.query('SELECT * FROM email_settings LIMIT 1');
    if (check.rows.length === 0) {
      return res.json({
        mailer_type: 'smtp',
        smtp_host: '',
        smtp_port: '587',
        smtp_encryption: 'tls',
        smtp_username: '',
        smtp_password: '',
        sender_name: 'Perplexta',
        sender_email: '',
        status: 'pending',
        last_verified_at: null
      });
    }
    res.json(check.rows[0]);
  } catch (error: any) {
    console.error('[EmailConfig] Failed to fetch config:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// PUT /api/mail-services-v3/config
router.put('/config', authenticateAdmin, async (req, res) => {
  try {
    const {
      mailer_type,
      smtp_host,
      smtp_port,
      smtp_encryption,
      smtp_username,
      smtp_password,
      sender_name,
      sender_email
    } = req.body;

    const upsertRes = await pool.query(`
      INSERT INTO email_settings (
        id, mailer_type, smtp_host, smtp_port, smtp_encryption, 
        smtp_username, smtp_password, sender_name, sender_email, status
      )
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      ON CONFLICT (id) DO UPDATE SET
        mailer_type = EXCLUDED.mailer_type,
        smtp_host = EXCLUDED.smtp_host,
        smtp_port = EXCLUDED.smtp_port,
        smtp_encryption = EXCLUDED.smtp_encryption,
        smtp_username = EXCLUDED.smtp_username,
        smtp_password = EXCLUDED.smtp_password,
        sender_name = EXCLUDED.sender_name,
        sender_email = EXCLUDED.sender_email,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      mailer_type || 'smtp',
      smtp_host || '',
      String(smtp_port || '587'),
      smtp_encryption || 'tls',
      smtp_username || '',
      smtp_password || '',
      sender_name || 'Perplexta',
      sender_email || ''
    ]);
    res.json(upsertRes.rows[0]);
  } catch (error: any) {
    console.error('[EmailConfig] Failed to save config:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST /api/mail-services-v3/verify
router.post('/verify', authenticateAdmin, async (req, res) => {
  try {
    const {
      mailer_type,
      smtp_host,
      smtp_port,
      smtp_encryption,
      smtp_username,
      smtp_password,
      sender_name,
      sender_email
    } = req.body;

    if (!smtp_host || !smtp_port) {
      return res.status(400).json({ error: 'SMTP Host and Port are required for verification.' });
    }

    // Try verifying connection using nodemailer
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port: parseInt(smtp_port || '587'),
      secure: smtp_encryption === 'ssl',
      auth: {
        user: smtp_username,
        pass: smtp_password
      },
      connectionTimeout: 10000 // 10s timeout
    });

    try {
      await transporter.verify();
    } catch (verifyErr: any) {
      console.error('[EmailConfig] Verification failed:', verifyErr);
      return res.status(400).json({ error: `Connection failed: ${verifyErr.message}` });
    }

    // Connection verified successfully, let's update database or insert using high-performance UPSERT
    const upsertRes = await pool.query(`
      INSERT INTO email_settings (
        id, mailer_type, smtp_host, smtp_port, smtp_encryption, 
        smtp_username, smtp_password, sender_name, sender_email, 
        status, last_verified_at
      )
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, 'active', CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        mailer_type = EXCLUDED.mailer_type,
        smtp_host = EXCLUDED.smtp_host,
        smtp_port = EXCLUDED.smtp_port,
        smtp_encryption = EXCLUDED.smtp_encryption,
        smtp_username = EXCLUDED.smtp_username,
        smtp_password = EXCLUDED.smtp_password,
        sender_name = EXCLUDED.sender_name,
        sender_email = EXCLUDED.sender_email,
        status = 'active',
        last_verified_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      mailer_type || 'smtp',
      smtp_host,
      String(smtp_port),
      smtp_encryption || 'tls',
      smtp_username || '',
      smtp_password || '',
      sender_name || 'Perplexta',
      sender_email || ''
    ]);
    const savedRow = upsertRes.rows[0];

    res.json({ success: true, config: savedRow });
  } catch (error: any) {
    console.error('[EmailConfig] Verify failed:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// GET /api/mail-services-v3/templates
router.get('/templates', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM email_templates ORDER BY name ASC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('[EmailTemplates] Failed to fetch templates:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST /api/mail-services-v3/templates
router.post('/templates', authenticateAdmin, async (req, res) => {
  try {
    const {
      id,
      name,
      subject_en,
      subject_ar,
      body_en,
      body_ar,
      type
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Template name is required.' });
    }

    let savedTemplate;
    if (id) {
      const updateRes = await pool.query(`
        UPDATE email_templates SET
          name = $1, subject_en = $2, subject_ar = $3,
          body_en = $4, body_ar = $5, type = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `, [
        name.trim(),
        subject_en || '',
        subject_ar || '',
        body_en || '',
        body_ar || '',
        type || 'custom',
        id
      ]);
      savedTemplate = updateRes.rows[0];
    } else {
      const insertRes = await pool.query(`
        INSERT INTO email_templates (name, subject_en, subject_ar, body_en, body_ar, type)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name) DO UPDATE SET
          subject_en = EXCLUDED.subject_en,
          subject_ar = EXCLUDED.subject_ar,
          body_en = EXCLUDED.body_en,
          body_ar = EXCLUDED.body_ar,
          type = EXCLUDED.type,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [
        name.trim(),
        subject_en || '',
        subject_ar || '',
        body_en || '',
        body_ar || '',
        type || 'custom'
      ]);
      savedTemplate = insertRes.rows[0];
    }

    res.json(savedTemplate);
  } catch (error: any) {
    console.error('[EmailTemplates] Failed to save template:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// DELETE /api/mail-services-v3/templates/:id
router.delete('/templates/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM email_templates WHERE id = $1', [id]);
    res.json({ success: true, message: 'Template deleted successfully.' });
  } catch (error: any) {
    console.error('[EmailTemplates] Failed to delete template:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// POST /api/mail-services-v3/sync
router.post('/sync', authenticateAdmin, async (req, res) => {
  try {
    await syncSystemTemplates();
    res.json({ success: true, message: 'System templates synchronized successfully.' });
  } catch (error: any) {
    console.error('[EmailTemplates] Failed to sync templates:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
