import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../db/index.js';

const router = express.Router();

router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const { content, title, model_name } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required to generate a snapshot' });
    }

    const id = crypto.randomBytes(8).toString('hex');
    const userId = req.user.id;

    await pool.query(
      `INSERT INTO shared_snapshots (id, user_id, title, content, model_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, title || null, content, model_name || null]
    );

    res.json({ id });
  } catch (error: any) {
    console.error('[ShareRoute] Error generating snapshot:', error);
    res.status(500).json({ error: error.message || 'Failed to generate public snapshot' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const snapRes = await pool.query(
      `SELECT id, title, content, model_name, created_at, views_count 
       FROM shared_snapshots 
       WHERE id = $1`,
      [id]
    );

    if (snapRes.rows.length === 0) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    const snapshot = snapRes.rows[0];

    pool.query(
      `UPDATE shared_snapshots SET views_count = views_count + 1 WHERE id = $1`,
      [id]
    ).catch((err: any) => {
      console.error('[ShareRoute] Failed to increment views_count:', err);
    });

    res.json({
      ...snapshot,
      views_count: snapshot.views_count + 1
    });
  } catch (error: any) {
    console.error('[ShareRoute] Error retrieving snapshot:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve public snapshot' });
  }
});

export default router;
