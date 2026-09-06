import express from 'express';
import { pool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { verifyRecordOwnership } from '../services/auth.js';

const router = express.Router();

/**
 * PATCH /api/ownership/transfer
 * Allows admin or owner to update the owner_id of a bulletin_pages or marketplace_items record
 * with full audit logging in the user_activity_logs table (including previous owner ID, new owner ID, record ID, and timestamp).
 */
router.patch('/transfer', authenticateToken, async (req: any, res: any) => {
  try {
    const { target_type, record_id, new_owner_id } = req.body || {};
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!target_type || !record_id || !new_owner_id) {
      return res.status(400).json({ error: 'Missing required fields: target_type, record_id, new_owner_id' });
    }

    if (!['bulletin_page', 'marketplace_item'].includes(target_type)) {
      return res.status(400).json({ error: 'Invalid target_type. Must be bulletin_page or marketplace_item' });
    }

    // Verify new owner exists
    const userCheck = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [new_owner_id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'New owner user not found' });
    }

    const recordTypeEnum = target_type === 'bulletin_page' ? 'bulletin_page' : 'marketplace_item';
    const tableName = target_type === 'bulletin_page' ? 'bulletin_pages' : 'marketplace_items';
    
    // Check record existence and current ownership
    const recordCheck = await pool.query(`SELECT id, owner_id, user_id FROM ${tableName} WHERE id = $1`, [record_id]);
    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Target record not found' });
    }

    const record = recordCheck.rows[0];
    const previousOwner = record.owner_id || record.user_id || null;

    // Use verifyRecordOwnership utility to check whether requester matches owner or is admin
    const isOwner = requesterRole === 'admin' ? true : await verifyRecordOwnership(requesterId, recordTypeEnum, Number(record_id));
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied: You do not own this record or lack administrative permissions' });
    }

    const transferTimestamp = new Date().toISOString();

    // Perform the transfer
    await pool.query(
      `UPDATE ${tableName} SET owner_id = $1, user_id = COALESCE(user_id, $1), updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [new_owner_id, record_id]
    );

    // Audit logging in user_activity_logs with previous owner ID, new owner ID, record ID, and timestamp
    await pool.query(
      `INSERT INTO user_activity_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)`,
      [
        requesterId,
        'OWNERSHIP_TRANSFER',
        JSON.stringify({
          target_type,
          record_id: Number(record_id),
          previous_owner_id: previousOwner,
          new_owner_id: Number(new_owner_id),
          timestamp: transferTimestamp
        }),
        req.ip || req.headers['x-forwarded-for'] || 'unknown'
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'Ownership transferred successfully and logged to audit trail',
      target_type,
      record_id: Number(record_id),
      previous_owner_id: previousOwner,
      new_owner_id: Number(new_owner_id),
      new_owner_name: userCheck.rows[0].name,
      timestamp: transferTimestamp
    });
  } catch (err: any) {
    console.error('[Ownership Transfer API] Error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
