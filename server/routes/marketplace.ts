import express from 'express';
import { pool } from '../db/index.js';
import { authenticateToken, authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to validate URLs (protects from SSRF / Phishing)
function isSafeUrl(urlStr: string): boolean {
  if (!urlStr) return true;
  try {
    if (urlStr.startsWith('/')) {
      return !urlStr.includes('..') && !urlStr.includes('\\');
    }
    if (urlStr.startsWith('mailto:') || urlStr.startsWith('tel:')) {
      return true;
    }
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      return false;
    }
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    const blockedHosts = [
      'localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254',
      '::1', '::', 'metadata.google.internal'
    ];
    if (blockedHosts.includes(hostname)) {
      return false;
    }
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

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
    console.error('Failed to fetch items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
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
    console.error('Failed to fetch admin items:', error);
    res.status(500).json({ error: 'Failed to fetch admin items' });
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
    console.error('Failed to fetch item details:', error);
    res.status(500).json({ error: 'Failed to fetch item details' });
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

  // Price validation: Must be a constructive positive number
  const numPrice = Number(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number' });
  }

  // Anti-SSRF / Phishing validations
  if (image_url && !isSafeUrl(image_url)) {
    return res.status(400).json({ error: 'Insecure or invalid image URL' });
  }
  if (contact_link && !isSafeUrl(contact_link)) {
    return res.status(400).json({ error: 'Insecure or invalid contact link' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO marketplace_items (
        user_id, title_en, title_ar, description_en, description_ar, price, category_en, category_ar, image_url, contact_link, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [userId, title_en, title_ar, description_en, description_ar, numPrice, category_en, category_ar, image_url, contact_link, status]);

    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (error: any) {
    console.error('Failed to create item:', error);
    res.status(500).json({ error: 'Failed to create item' });
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

    // Status Whitelisting
    const ALLOWED_STATUSES = ['pending', 'approved', 'rejected', 'sold'];
    if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status value. Allowed status: ${ALLOWED_STATUSES.join(', ')}` });
    }

    // Price validation: Must be positive if provided
    let finalPrice = undefined;
    if (price !== undefined) {
      finalPrice = Number(price);
      if (isNaN(finalPrice) || finalPrice < 0) {
        return res.status(400).json({ error: 'Price must be a valid positive number' });
      }
    }

    // Anti-SSRF / Phishing validations
    if (image_url && !isSafeUrl(image_url)) {
      return res.status(400).json({ error: 'Insecure or invalid image URL' });
    }
    if (contact_link && !isSafeUrl(contact_link)) {
      return res.status(400).json({ error: 'Insecure or invalid contact link' });
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
    `, [title_en, title_ar, description_en, description_ar, finalPrice !== undefined ? finalPrice : null, category_en, category_ar, image_url, contact_link, finalStatus, id]);

    res.json({ success: true, item: result.rows[0] });
  } catch (error: any) {
    console.error('Failed to update item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Admin ONLY: Set status of marketplace item (approve, reject, sold, etc)
router.patch('/admin/items/:id/status', authenticateToken, authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const ALLOWED_STATUSES = ['pending', 'approved', 'rejected', 'sold'];
  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}` });
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
    console.error('Failed to update status:', error);
    res.status(500).json({ error: 'Failed to update status' });
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
    console.error('Failed to delete item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;
