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

// GET /api/admin/plans
router.get("/", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM plans ORDER BY monthly_price ASC');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/plans
router.post("/", async (req, res) => {
  try {
    const { name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, is_visible, monthly_price, annual_price, color, features, limits } = req.body;
    if (!name_en) return res.status(400).json({ error: 'name_en is required' });
    await pool.query(`
      INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, is_visible, monthly_price, annual_price, color, features, limits)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, is_visible, monthly_price, annual_price, color, JSON.stringify(features), JSON.stringify(limits)]);
    await auditLog((req as any).user?.id, 'Create Plan', 'system', { name_en });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/plans/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, is_visible, monthly_price, annual_price, color, features, limits } = req.body;
    await pool.query(`
      UPDATE plans SET 
        name_en = $1, name_ar = $2, desc_en = $3, desc_ar = $4, badge = $5, 
        discount = $6, is_active = $7, is_visible = $8, monthly_price = $9, annual_price = $10, 
        color = $11, features = $12, limits = $13, updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
    `, [name_en, name_ar, desc_en, desc_ar, badge, discount, is_active, is_visible, monthly_price, annual_price, color, JSON.stringify(features), JSON.stringify(limits), id]);
    await auditLog((req as any).user?.id, 'Update Plan', 'system', { id, name_en });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/admin/plans/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM plans WHERE id = $1', [id]);
    await auditLog((req as any).user?.id, 'Delete Plan', 'system', { id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
