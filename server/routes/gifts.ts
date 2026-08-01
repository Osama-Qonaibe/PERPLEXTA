import express from 'express';
import { pool, ledgerPool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { createNotification } from '../services/notifications.js';
import { getUserWallet } from '../services/wallet.js';
import { getSystemSettings } from '../services/system.js';
import { io } from '../config/socket.js';

const router = express.Router();

/**
 * GET /api/gifts
 * List all active gifts in the catalog
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM gift_catalog WHERE is_active = true ORDER BY points ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('[Gifts API] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch gift catalog' });
  }
});

/**
 * POST /api/gifts/send
 * Send a gift to another user (e.g. in live stream)
 */
router.post('/send', authenticateToken, async (req: any, res) => {
  const senderId = req.user.id;
  const { giftId, recipientId, context = 'bulletin' } = req.body;

  if (!giftId || !recipientId) {
    return res.status(400).json({ error: 'Gift ID and Recipient ID are required' });
  }

  if (senderId === parseInt(recipientId)) {
    return res.status(400).json({ error: 'You cannot send a gift to yourself' });
  }

  const client = await (ledgerPool || pool).connect();
  try {
    const giftRes = await pool.query('SELECT * FROM gift_catalog WHERE id = $1 AND is_active = true', [giftId]);
    if (giftRes.rows.length === 0) {
      return res.status(404).json({ error: 'Gift not found or inactive' });
    }
    const gift = giftRes.rows[0];

    const settings = await getSystemSettings();
    const commissionPercent = parseInt(settings.live_gift_commission_percent || '30', 10);
    
    await client.query('BEGIN');

    const senderWallet = await getUserWallet(senderId, client);
    if (Number(senderWallet.points) < gift.points) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Insufficient points. You have ${senderWallet.points} points, but this gift costs ${gift.points}.`,
        error_ar: `نقاطك غير كافية. لديك ${senderWallet.points} نقطة، وتكلفة هذه الهدية ${gift.points} نقطة.`
      });
    }

    await client.query(
      'UPDATE wallets SET points = points - $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [gift.points, senderId]
    );

    const recipientPoints = Math.floor(gift.points * (1 - (commissionPercent / 100)));
    
    const recipientWallet = await getUserWallet(recipientId, client);
    await client.query(
      'UPDATE wallets SET points = points + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [recipientPoints, recipientId]
    );

    await client.query(`
      INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, status, description)
      VALUES ($1, $2, 0, $3, 'gift_sent', 'success', $4)
    `, [
      senderId,
      senderWallet.id,
      -gift.points,
      `إرسال هدية (${gift.name_ar}) إلى مستخدم آخر / Sent gift (${gift.name_en})`
    ]);

    await client.query(`
      INSERT INTO ledger_transactions (user_id, wallet_id, amount, points, transaction_type, status, description)
      VALUES ($1, $2, 0, $3, 'gift_received', 'success', $4)
    `, [
      recipientId,
      recipientWallet.id,
      recipientPoints,
      `استلام هدية (${gift.name_ar}) من ${req.user.name} / Received gift from ${req.user.name}`
    ]);

    await client.query('COMMIT');

    await createNotification(
      recipientId,
      'gift',
      'You received a gift! 🎁',
      `لقد استلمت هدية ${gift.icon} !`,
      `${req.user.name} sent you a ${gift.name_en}. You earned ${recipientPoints} points!`,
      `أرسل لك ${req.user.name} هدية ${gift.name_ar}. لقد ربحت ${recipientPoints} نقطة!`,
      { gift_id: gift.id, sender_id: senderId }
    ).catch(e => console.error('Gift notification error:', e));

    if (io) {
      io.emit('gift_sent', {
        gift,
        senderName: req.user.name,
        senderId,
        recipientId,
        context
      });
      
      io.to(`user_${senderId}`).emit('balance_update', {
        points: Number(senderWallet.points) - gift.points,
        balance: Number(senderWallet.balance)
      });

      io.to(`user_${recipientId}`).emit('balance_update', {
        points: Number(recipientWallet.points) + recipientPoints,
        balance: Number(recipientWallet.balance)
      });
    }

    res.json({
      success: true,
      message: 'Gift sent successfully',
      remainingPoints: Number(senderWallet.points) - gift.points
    });

  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('[Gifts API] Send error:', error);
    res.status(500).json({ error: error.message || 'Failed to send gift' });
  } finally {
    if (client) client.release();
  }
});

export default router;
