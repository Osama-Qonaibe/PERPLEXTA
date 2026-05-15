import { Router } from "express";
import { pool } from "../../db/index.js";
import { authenticate, adminOnly } from "../../middleware/auth.js";

const router = Router();
router.use(authenticate, adminOnly);

async function auditLog(userId: any, action: string, type: string, details: object) {
  try {
    await pool.query(
      'INSERT INTO system_logs (user_id, action, type, details) VALUES ($1, $2, $3, $4)',
      [userId, action, type, JSON.stringify(details)]
    );
  } catch {}
}

// GET /api/admin/emails (Templates)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM email_templates ORDER BY created_at DESC');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/emails (Create Template)
router.post("/", async (req, res) => {
  try {
    const { name, subject_en, subject_ar, body_en, body_ar, type } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    await pool.query(`
      INSERT INTO email_templates (name, subject_en, subject_ar, body_en, body_ar, type)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [name, subject_en, subject_ar, body_en, body_ar, type || 'custom']);
    
    await auditLog((req as any).user?.id, 'Create Email Template', 'system', { name });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/emails/:id (Update Template)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject_en, subject_ar, body_en, body_ar, type } = req.body;

    await pool.query(`
      UPDATE email_templates SET 
        name = $1, subject_en = $2, subject_ar = $3, 
        body_en = $4, body_ar = $5, type = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [name, subject_en, subject_ar, body_en, body_ar, type, id]);
    
    await auditLog((req as any).user?.id, 'Update Email Template', 'system', { id, name });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/admin/emails/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM email_templates WHERE id = $1', [id]);
    await auditLog((req as any).user?.id, 'Delete Email Template', 'system', { id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/broadcasts
router.get("/broadcasts", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_broadcasts ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// POST /api/admin/broadcast
router.post("/broadcast", async (req, res) => {
  try {
    const { title_en, title_ar, content_en, content_ar, type, target_group } = req.body;
    if (!title_en || !content_en) return res.status(400).json({ error: 'title_en and content_en are required' });

    const countRes = await pool.query(
      target_group === 'all'
        ? 'SELECT COUNT(*) FROM users WHERE status = $1'
        : 'SELECT COUNT(*) FROM users u JOIN subscriptions s ON u.id = s.user_id WHERE u.status = $1',
      ['active']
    );
    const sentCount = parseInt(countRes.rows[0].count) || 0;

    const result = await pool.query(`
      INSERT INTO system_broadcasts (title_en, title_ar, content_en, content_ar, type, target_group, status, sent_count)
      VALUES ($1, $2, $3, $4, $5, $6, 'sent', $7)
      RETURNING id
    `, [title_en, title_ar, content_en, content_ar, type, target_group, sentCount]);
    
    await auditLog((req as any).user?.id, 'Send Broadcast', 'system', { title_en, target_group, sentCount });
    res.json({ success: true, broadcastId: result.rows[0].id });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// Compatibility path for old frontend
router.post("/broadcasts/send", async (req, res) => {
  try {
    const { title_en, title_ar, content_en, content_ar, type, target_group } = req.body;
    const countRes = await pool.query('SELECT COUNT(*) FROM users WHERE status = $1', ['active']);
    const sentCount = parseInt(countRes.rows[0].count) || 0;
    const result = await pool.query(`
      INSERT INTO system_broadcasts (title_en, title_ar, content_en, content_ar, type, target_group, status, sent_count)
      VALUES ($1, $2, $3, $4, $5, $6, 'sent', $7)
      RETURNING id
    `, [title_en, title_ar, content_en, content_ar, type, target_group, sentCount]);
    res.json({ success: true, broadcastId: result.rows[0].id });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;
