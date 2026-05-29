import express from 'express';
import { pool } from '../db/index.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get approved marketplace items
router.get('/items', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, u.name as seller_name, u.avatar as seller_avatar, u.role as seller_role
      FROM marketplace_items m
      JOIN users u ON m.user_id = u.id
      WHERE m.status = 'approved'
      ORDER BY m.created_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch items', details: error.message });
  }
});

// Admin ONLY: Get all items (pending, approved, rejected, sold)
router.get('/admin/items', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, u.name as seller_name, u.avatar as seller_avatar, u.role as seller_role
      FROM marketplace_items m
      JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch admin items', details: error.message });
  }
});

// Get single item detail
router.get('/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Increment view count
    await pool.query('UPDATE marketplace_items SET views = views + 1 WHERE id = $1', [id]);

    const result = await pool.query(`
      SELECT m.*, u.name as seller_name, u.avatar as seller_avatar, u.role as seller_role
      FROM marketplace_items m
      JOIN users u ON m.user_id = u.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch item details', details: error.message });
  }
});

// Create marketplace item
router.post('/items', authenticateToken, async (req: any, res) => {
  const { title_en, title_ar, description_en, description_ar, price, category_en, category_ar, image_url, contact_link } = req.body;
  const userId = req.user.id;
  const isUserAdmin = req.user.role === 'admin';

  // If user is admin, auto-approve. Otherwise, auto-approve or set to pending.
  // Let's set to approved for admin, and pending for regular users to allow the admin section section in control panel to manage it!
  const status = isUserAdmin ? 'approved' : 'pending';

  if (!title_en || !title_ar || !description_en || !description_ar || price === undefined || !category_en || !category_ar) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO marketplace_items (
        user_id, title_en, title_ar, description_en, description_ar, price, category_en, category_ar, image_url, contact_link, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [userId, title_en, title_ar, description_en, description_ar, price, category_en, category_ar, image_url, contact_link, status]);

    res.status(211).json({ success: true, item: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create item', details: error.message });
  }
});

// Edit marketplace item (only owner or admin)
router.patch('/items/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { title_en, title_ar, description_en, description_ar, price, category_en, category_ar, image_url, contact_link, status } = req.body;
  const userId = req.user.id;
  const isUserAdmin = req.user.role === 'admin';

  try {
    // Check ownership
    const checkRes = await pool.query('SELECT user_id, status FROM marketplace_items WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = checkRes.rows[0];
    if (item.user_id !== userId && !isUserAdmin) {
      return res.status(403).json({ error: 'Forbidden: You do not own this item' });
    }

    // Admins can update status to approved/rejected/sold, users can update status to sold
    let finalStatus = item.status;
    if (status !== undefined) {
      if (isUserAdmin) {
        finalStatus = status;
      } else if (status === 'sold') {
        finalStatus = 'sold';
      }
    }

    const result = await pool.query(`
      UPDATE marketplace_items
      SET title_en = COALESCE($1, title_en),
          title_ar = COALESCE($2, title_ar),
          description_en = COALESCE($3, description_en),
          description_ar = COALESCE($4, description_ar),
          price = COALESCE($5, price),
          category_en = COALESCE($6, category_en),
          category_ar = COALESCE($7, category_ar),
          image_url = COALESCE($8, image_url),
          contact_link = COALESCE($9, contact_link),
          status = $10,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [title_en, title_ar, description_en, description_ar, price, category_en, category_ar, image_url, contact_link, finalStatus, id]);

    res.json({ success: true, item: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update item', details: error.message });
  }
});

// Admin ONLY: Set status of marketplace item (approve, reject, sold, etc)
router.patch('/admin/items/:id/status', authenticateToken, authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const result = await pool.query(`
      UPDATE marketplace_items
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ success: true, item: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update status', details: error.message });
  }
});

// Delete marketplace item (only owner or admin)
router.delete('/items/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const isUserAdmin = req.user.role === 'admin';

  try {
    const checkRes = await pool.query('SELECT user_id FROM marketplace_items WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = checkRes.rows[0];
    if (item.user_id !== userId && !isUserAdmin) {
      return res.status(403).json({ error: 'Forbidden: You do not own this item' });
    }

    await pool.query('DELETE FROM marketplace_items WHERE id = $1', [id]);
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete item', details: error.message });
  }
});

export default router;
