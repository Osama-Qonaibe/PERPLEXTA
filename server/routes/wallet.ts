import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { pool, getLedgerPool } from '../db/index.js';
import { 
  getUserWallet, 
  getTransactionHistory, 
  checkReferralActivation,
  depositToWallet
} from '../services/wallet.js';

const router = express.Router();

router.get("/", authenticateToken, async (req: any, res) => {
  try {
    await checkReferralActivation(req.user.id);
    const wallet = await getUserWallet(req.user.id);
    const { getEconomySettings } = await import('../services/wallet.js');
    const ecoSettings = await getEconomySettings();
    res.json({
      ...wallet,
      crypto_address: ecoSettings.crypto_address,
      bank_name: ecoSettings.bank_name,
      bank_recipient: ecoSettings.bank_recipient,
      bank_iban: ecoSettings.bank_iban,
      bank_swift: ecoSettings.bank_swift,
      paypal_email: ecoSettings.paypal_email
    });
  } catch (error: any) {
    console.error('[Wallet] Fetch Error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});


router.post("/deposit-manual", authenticateToken, async (req: any, res) => {
  try {
    const { amount, method, reference_id, proof_url } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount', error_ar: 'قيمة الإيداع غير صالحة' });
    }
    if (!method) {
      return res.status(400).json({ error: 'Method is required', error_ar: 'طريقة الدفع مطلوبة' });
    }
    if (!reference_id) {
      return res.status(400).json({ error: 'Transaction reference is required', error_ar: 'الرقم المرجعي أو الإثبات مطلوب' });
    }

    const ledger = getLedgerPool();

    const proofPayload = JSON.stringify({
      reference_id,
      image_url: proof_url || ''
    });

    const query = `
      INSERT INTO deposit_requests (user_id, amount, method, proof_url, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await ledger.query(query, [
      req.user.id,
      Number(amount),
      method,
      proofPayload,
      'pending'
    ]);
    res.json({ success: true, request: result.rows[0] });
  } catch (error: any) {
    console.error('[Wallet] Deposit Manual Error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit manual deposit request' });
  }
});

router.get("/manual-deposits", authenticateToken, async (req: any, res) => {
  try {
    const ledger = getLedgerPool();
    const result = await ledger.query(
      'SELECT id, amount, currency, method, status, rejection_reason, created_at, proof_url FROM deposit_requests WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('[Wallet] Fetch Manual Deposits Error:', error);
    res.status(500).json({ error: 'Failed to retrieve manual deposit requests' });
  }
});

router.post("/clear", authenticateToken, async (req: any, res) => {
  try {
    const ledger = getLedgerPool();
    await ledger.query(
      'UPDATE ledger_transactions SET is_hidden = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true, message: 'All transactions successfully archived' });
  } catch (error: any) {
    console.error('[Wallet] Clear History Error:', error);
    res.status(500).json({ error: 'Failed to clear/archive transaction history' });
  }
});

router.post("/hide", authenticateToken, async (req: any, res) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }
    const ledger = getLedgerPool();
    await ledger.query(
      'UPDATE ledger_transactions SET is_hidden = true WHERE id = $1 AND user_id = $2',
      [transactionId, req.user.id]
    );
    res.json({ success: true, message: 'Transaction successfully archived' });
  } catch (error: any) {
    console.error('[Wallet] Hide Transaction Error:', error);
    res.status(500).json({ error: 'Failed to archive transaction' });
  }
});


router.post("/convert-points", authenticateToken, async (req: any, res) => {
  try {
    const { amountPoints } = req.body;
    if (!amountPoints || isNaN(amountPoints)) return res.status(400).json({ error: 'Invalid amount' });
    const result = await import('../services/wallet.js').then(s => s.convertPointsToBalance(req.user.id, Number(amountPoints)));
    res.json(result);
  } catch (error: any) {
    console.error('[Wallet] Conversion Error:', error);
    res.status(400).json({ error: error.message || 'Failed to convert points' });
  }
});

router.post("/withdraw", authenticateToken, async (req: any, res) => {
  try {
    const { amountUSD, method, details } = req.body;
    if (!amountUSD || !method || !details) return res.status(400).json({ error: 'Missing information' });
    const result = await import('../services/wallet.js').then(s => s.requestWithdrawal(req.user.id, Number(amountUSD), method, details));
    res.json(result);
  } catch (error: any) {
    console.error('[Wallet] Withdrawal Error:', error);
    res.status(400).json({ error: error.message || 'Failed to request withdrawal' });
  }
});

router.get("/referral-count", authenticateToken, async (req: any, res) => {
  try {
    const count = await import('../services/wallet.js').then(s => s.getReferralCount(req.user.id));
    res.json({ count });
  } catch (error: any) {
    console.error('[Wallet] Referral Count Error:', error);
    res.status(500).json({ error: 'Failed to fetch referral count' });
  }
});

router.get("/history", authenticateToken, async (req: any, res) => {
  try {
    const type = req.query.type as string || 'all';
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const history = await getTransactionHistory(req.user.id, type, limit, offset);
    res.json(history);
  } catch (error: any) {
    console.error('[Wallet] History Error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction history' });
  }
});

router.post("/activate-referral-balance", authenticateToken, async (req: any, res) => {
  try {
    const ledger = getLedgerPool();
    
    const { getUserWallet, getEconomySettings } = await import('../services/wallet.js');
    const { createNotification } = await import('../services/notifications.js');
    const { io } = await import('../config/socket.js');
    
    const userId = req.user.id;
    const wallet = await getUserWallet(userId);
    
    if (wallet.referral_activated) {
      return res.status(400).json({ 
        error: 'Referral program is already activated.', 
        error_ar: 'نظام الإحالات والأرباح مفعل بالفعل في حسابك.' 
      });
    }
    
    const settings = await getEconomySettings();
    const minDeposit = Number(settings.referral_activation_min_deposit || 10);
    const balanceNum = Number(wallet.balance);
    
    if (balanceNum < minDeposit) {
      return res.status(400).json({ 
        error: `Insufficient balance. You need at least $${minDeposit} to activate.`, 
        error_ar: `رصيدك غير كافٍ. تحتاج إلى ما لا يقل عن $${minDeposit} للتنشيط.` 
      });
    }
    
    const client = await ledger.connect();
    try {
      await client.query('BEGIN');
      
      const lockRes = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
      const currentBalance = Number(lockRes.rows[0].balance);
      if (currentBalance < minDeposit) {
        throw new Error('Insufficient balance during execution.');
      }
      
      await client.query(
        'UPDATE wallets SET balance = balance - $1, referral_activated = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [minDeposit, userId]
      );
      
      await client.query(`
        INSERT INTO ledger_transactions (wallet_id, user_id, amount, points, transaction_type, status, description)
        VALUES ($1, $2, $3, 0, 'activation_fee', 'success', $4)
      `, [
        lockRes.rows[0].id,
        userId,
        -minDeposit,
        `رسوم تفعيل نظام الإحالات والأرباح / Referral program activation fee`
      ]);
      
      await client.query('COMMIT');
      
      try {
        await createNotification(
          userId,
          'gift',
          'Referral Program Activated! 🚀',
          'تم تفعيل برنامج الأرباح! 🚀',
          `Your referral and earnings system has been successfully activated by drawing $${minDeposit} from your balance. You can now invite friends and earn rewards!`,
          `تم تفعيل نظام الأرباح والإحالات لحسابك بنجاح بخصم $${minDeposit} من رصيدك المتاح. يمكنك الآن مشاركة الرابط وجني الأرباح!`
        );
      } catch (notifErr) {
        console.error('Failed to create notification:', notifErr);
      }
      
      if (io) {
        io.to(`user_${userId}`).emit('balance_update', {
          points: Number(wallet.points),
          balance: currentBalance - minDeposit,
          referral_activated: true
        });
        io.to(`user_${userId}`).emit('user_profile_updated');
      }
      
      res.json({ success: true, newBalance: currentBalance - minDeposit });
    } catch (dbErr: any) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Wallet] Activate Referral Balance Error:', error);
    res.status(500).json({ error: error.message || 'Failed to activate with balance' });
  }
});

router.get("/referred-friends-detailed", authenticateToken, async (req: any, res) => {
  try {
    const ledger = getLedgerPool();

    const referrerId = req.user.id;

    const ledgerQuery = `
      SELECT
        r.id as referral_id,
        r.referred_id,
        r.status as referral_status,
        r.bonus_points,
        r.created_at as referral_created_at,
        d.status as deposit_status,
        d.amount as deposit_amount,
        d.method as deposit_method,
        d.rejection_reason as deposit_rejection_reason,
        d.created_at as deposit_created_at
      FROM referrals r
      LEFT JOIN (
        SELECT DISTINCT ON (user_id) user_id, status, amount, method, rejection_reason, created_at
        FROM deposit_requests
        ORDER BY user_id, created_at DESC
      ) d ON r.referred_id = d.user_id
      WHERE r.referrer_id = $1
      ORDER BY r.created_at DESC
    `;

    const ledgerRes = await ledger.query(ledgerQuery, [referrerId]);
    const referrals = ledgerRes.rows;

    if (referrals.length === 0) {
      return res.json([]);
    }

    const referredIds = referrals.map((r: any) => r.referred_id);

    const placeholders = referredIds.map((_: any, i: number) => `$${i + 1}`).join(', ');
    const coreQuery = `
      SELECT id, name, email, avatar, created_at as user_joined_at
      FROM users
      WHERE id IN (${placeholders})
    `;

    const coreRes = await pool.query(coreQuery, referredIds);
    const usersMap = new Map<number, any>();
    coreRes.rows.forEach((u: any) => {
      usersMap.set(u.id, u);
    });

    const detailedReferrals = referrals.map((r: any) => {
      const userDetails = usersMap.get(r.referred_id) || {
        name: 'Perplexta Member',
        email: 'member@perplexta.com',
        avatar: null,
        user_joined_at: r.referral_created_at
      };

      return {
        referral_id: r.referral_id,
        friend_id: r.referred_id,
        name: userDetails.name,
        email: userDetails.email,
        avatar: userDetails.avatar,
        joined_at: userDetails.user_joined_at || r.referral_created_at,
        referral_status: r.referral_status,
        bonus_points: r.bonus_points,
        deposit_status: r.deposit_status || null,
        deposit_amount: r.deposit_amount || null,
        deposit_method: r.deposit_method || null,
        deposit_rejection_reason: r.deposit_rejection_reason || null,
        deposit_created_at: r.deposit_created_at || null
      };
    });

    res.json(detailedReferrals);
  } catch (error: any) {
    console.error('[Wallet] Get Referred Friends Detailed Error:', error);
    res.status(500).json({ error: 'Failed to retrieve detailed referred friends' });
  }
});

router.get("/referral-invitations", authenticateToken, async (req: any, res) => {
  try {
    const { pool } = await import('../db/index.js');
    if (!pool) {
      return res.status(500).json({ error: 'Database service is temporarily unavailable' });
    }
    const referrerId = req.user.id;
    const result = await pool.query(
      'SELECT id, email, status, subject, created_at, updated_at FROM referral_invitations WHERE referrer_id = $1 ORDER BY created_at DESC',
      [referrerId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('[Wallet] Get Referral Invitations error:', error);
    res.status(500).json({ error: 'Failed to retrieve sent referral invitations' });
  }
});

router.post("/invite-email", authenticateToken, async (req: any, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email address format.',
        error_ar: 'تنسيق البريد الإلكتروني غير صالح.'
      });
    }

    const { pool } = await import('../db/index.js');
    if (!pool) {
      return res.status(500).json({ error: 'Database service is temporarily unavailable.' });
    }

    const referrerId = req.user.id;

    const referrerRes = await pool.query(
      'SELECT name, email, referral_code FROM users WHERE id = $1',
      [referrerId]
    );
    if (referrerRes.rows.length === 0) {
      return res.status(444).json({ error: 'Referrer profile not found.' });
    }
    const referrer = referrerRes.rows[0];

    if (email.toLowerCase().trim() === referrer.email.toLowerCase().trim()) {
      return res.status(400).json({ 
        error: 'You cannot invite your own email address.',
        error_ar: 'لا يمكنك إرسال دعوة إحالة إلى بريدك الإلكتروني.'
      });
    }

    const userCheck = await pool.query(
      'SELECT id, name, referred_by FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (userCheck.rows.length > 0) {
      const invitee = userCheck.rows[0];
      if (invitee.referred_by === referrerId) {
        return res.status(400).json({
          error: 'This email is already registered and referred by you.',
          error_ar: 'هذا البريد الإلكتروني مسجل بالفعل وهو مسجل كإحالة من قبلك.'
        });
      } else if (invitee.referred_by) {
        return res.status(400).json({
          error: 'This email is already registered under another referrer.',
          error_ar: 'هذا البريد الإلكتروني مسجل بالفعل تحت إحالة مستخدم آخر.'
        });
      } else {
        return res.status(400).json({
          error: 'This email is already registered directly, without a referrer.',
          error_ar: 'هذا البريد الإلكتروني مسجل بالفعل في المنصة مباشرةً بدون إحالة.'
        });
      }
    }

    const { getBaseUrl } = await import('../utils/request.js');
    const { sendSmartEmail } = await import('../services/email.js');

    const baseUrl = getBaseUrl(req);
    const invitationLink = `${baseUrl}/signup?ref=${referrer.referral_code}`;

    const lang = req.user.language === 'ar' ? 'ar' : 'en';

    const emailSent = await sendSmartEmail(referrerId, email.trim(), 'referral_invitation', {
      referrerName: referrer.name || 'A Peer Analyst',
      referralCode: referrer.referral_code || '',
      invitationLink,
      baseUrl
    }, lang as any);

    if (!emailSent) {
      return res.status(500).json({ 
        error: 'Failed to dispatch invitation. Please ensure system SMTP configurations are verified.',
        error_ar: 'فشل في إرسال بريد الدعوة الإلكتروني. يرجى التأكد من تفعيل وتوثيق خادم وبوابة البريد الصادر SMTP بنجاح.'
      });
    }

    const inviteCheck = await pool.query(
      'SELECT id FROM referral_invitations WHERE referrer_id = $1 AND LOWER(email) = LOWER($2)',
      [referrerId, email.trim().toLowerCase()]
    );

    if (inviteCheck.rows.length > 0) {
      await pool.query(
        'UPDATE referral_invitations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['sent', inviteCheck.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO referral_invitations (referrer_id, email, referred_email, invite_code, status, subject, body) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          referrerId,
          email.trim().toLowerCase(),
          email.trim().toLowerCase(),
          referrer.referral_code || null,
          'sent',
          lang === 'ar' ? 'دعوة تفعيل حصرية لمنصة التحليلات - بيربليكستا' : 'Exclusive Terminal Authorization Invitation - Perplexta',
          invitationLink
        ]
      );
    }

    res.json({ 
      success: true, 
      message: 'Professional referral invitation dispatched successfully.',
      message_ar: 'تم إرسال دعوة الإحالة المهنية بنجاح.'
    });

  } catch (error: any) {
    console.error('[Wallet] Send Invite Email Error:', error);
    res.status(500).json({ error: 'Failed to process email invitation.' });
  }
});

router.post("/remind-email", authenticateToken, async (req: any, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email address format.',
        error_ar: 'تنسيق البريد الإلكتروني غير صالح.'
      });
    }

    const { pool } = await import('../db/index.js');
    if (!pool) {
      return res.status(500).json({ error: 'Database service is temporarily unavailable.' });
    }

    const referrerId = req.user.id;

    const referrerRes = await pool.query(
      'SELECT name, email, referral_code FROM users WHERE id = $1',
      [referrerId]
    );
    if (referrerRes.rows.length === 0) {
      return res.status(444).json({ error: 'Referrer profile not found.' });
    }
    const referrer = referrerRes.rows[0];

    const userCheck = await pool.query(
      'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) AND referred_by = $2',
      [email.trim(), referrerId]
    );

    const inviteCheck = await pool.query(
      'SELECT id, email FROM referral_invitations WHERE referrer_id = $1 AND LOWER(email) = LOWER($2)',
      [referrerId, email.trim()]
    );

    if (userCheck.rows.length === 0 && inviteCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'This email is not invited or referred by you.',
        error_ar: 'هذا البريد الإلكتروني غير مدعو أو مسجل كإحالة من قبلك.'
      });
    }

    const { getBaseUrl } = await import('../utils/request.js');
    const { sendSmartEmail } = await import('../services/email.js');

    const baseUrl = getBaseUrl(req);
    const invitationLink = `${baseUrl}/signup?ref=${referrer.referral_code}`;

    const lang = req.user.language === 'ar' ? 'ar' : 'en';

    const emailSent = await sendSmartEmail(referrerId, email.trim(), 'referral_reminder', {
      referrerName: referrer.name || 'A Peer Analyst',
      referralCode: referrer.referral_code || '',
      invitationLink,
      baseUrl
    }, lang as any);

    if (!emailSent) {
      return res.status(500).json({ 
        error: 'Failed to dispatch reminder email.',
        error_ar: 'فشل في إرسال بريد التذكير المجدول.'
      });
    }

    if (inviteCheck.rows.length > 0) {
      await pool.query(
        'UPDATE referral_invitations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['reminded', inviteCheck.rows[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO referral_invitations (referrer_id, email, referred_email, invite_code, status, subject, body) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [
          referrerId,
          email.trim().toLowerCase(),
          email.trim().toLowerCase(),
          referrer.referral_code || null,
          'reminded',
          lang === 'ar' ? 'تذكير تفعيل حصري معلق للمنصة - بيربليكستا' : 'Pending Terminal Activation Reminder - Perplexta',
          invitationLink
        ]
      );
    }

    res.json({ 
      success: true, 
      message: 'One-click reminder email dispatched successfully.',
      message_ar: 'تم إرسال بريد التذكير التلقائي بنجاح.'
    });

  } catch (error: any) {
    console.error('[Wallet] Send Remind Email Error:', error);
    res.status(500).json({ error: 'Failed to process reminder email.' });
  }
});

export default router;
