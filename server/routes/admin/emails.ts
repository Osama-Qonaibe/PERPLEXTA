import { Router } from 'express';
import { adminOnly } from '../../middleware/adminOnly';
import { auth } from '../../middleware/auth';
import pool from '../../config/database';

const router = Router();

router.use(auth, adminOnly);

router.get('/templates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM email_templates ORDER BY name');
    res.json({ success: true, templates: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch templates' });
  }
});

router.put('/templates/:name', async (req, res) => {
  const { name } = req.params;
  const { subject, body } = req.body as { subject: string; body: string };
  try {
    await pool.query(
      `INSERT INTO email_templates (name, subject, body, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (name) DO UPDATE SET subject = $2, body = $3, updated_at = NOW()`,
      [name, subject, body]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save template' });
  }
});

router.get('/broadcasts', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM broadcast_campaigns ORDER BY created_at DESC LIMIT 50'
    );
    res.json({ success: true, broadcasts: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch broadcasts' });
  }
});

router.post('/broadcasts', async (req, res) => {
  const { title, titleAr, content, contentAr, broadcastType, targetGroup } = req.body as {
    title: string;
    titleAr: string;
    content: string;
    contentAr: string;
    broadcastType: 'email' | 'notification' | 'both';
    targetGroup: 'all' | 'pro' | 'free';
  };
  try {
    const result = await pool.query(
      `INSERT INTO broadcast_campaigns (title, title_ar, content, content_ar, type, target_group, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW()) RETURNING id`,
      [title, titleAr, content, contentAr, broadcastType, targetGroup]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create broadcast' });
  }
});

export default router;
