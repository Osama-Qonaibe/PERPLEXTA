import { Router } from "express";
import { pool, ledgerPool } from "../../db/index.js";
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

// GET /api/admin/users
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.status, u.created_at, u.last_active_at,
        u.kyc_status, u.kyc_required,
        s.plan_id, s.status as subscription_status, s.current_period_end
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      ORDER BY u.created_at DESC
    `);
    
    const walletRes = await ledgerPool.query('SELECT user_id, balance, points FROM wallets');
    const walletMap = new Map(walletRes.rows.map((row: any) => [row.user_id, row]));

    const usersWithWallets = result.rows.map((user: any) => {
      const wallet = walletMap.get(user.id) as any;
      return {
        ...user,
        balance: wallet ? wallet.balance : 0,
        points: wallet ? wallet.points : 0
      };
    });

    res.json(usersWithWallets);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/users/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status, kyc_status, kyc_rejection_reason, kyc_required } = req.body;
    
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (status && !['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (kyc_status && !['none', 'pending', 'verified', 'rejected'].includes(kyc_status)) {
      return res.status(400).json({ error: 'Invalid kyc_status' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const userUpdates = [];
      const userValues: any[] = [id];
      let valIdx = 2;

      if (role) { userUpdates.push(`role = $${valIdx++}`); userValues.push(role); }
      if (status) { userUpdates.push(`status = $${valIdx++}`); userValues.push(status); }
      if (kyc_status) { userUpdates.push(`kyc_status = $${valIdx++}`); userValues.push(kyc_status); }
      if (kyc_rejection_reason !== undefined) { userUpdates.push(`kyc_rejection_reason = $${valIdx++}`); userValues.push(kyc_rejection_reason); }
      if (kyc_required !== undefined) { userUpdates.push(`kyc_required = $${valIdx++}`); userValues.push(kyc_required); }

      if (userUpdates.length > 0) {
        await client.query(`UPDATE users SET ${userUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, userValues);
      }

      await client.query('COMMIT');
      await auditLog((req as any).user?.id, 'Update User', 'system', { targetUser: id, changes: { role, status, kyc_status } });
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/admin/users/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // We should probably deactivate rather than delete, but following plan
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    await auditLog((req as any).user?.id, 'Delete User', 'system', { targetUser: id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/kyc
router.get("/kyc", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, email, kyc_status, created_at FROM users WHERE kyc_status = 'pending'");
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /api/admin/kyc/:id
router.put("/kyc/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!['verified', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    await pool.query('UPDATE users SET kyc_status = $1, kyc_rejection_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [status, reason || null, id]);
    await auditLog((req as any).user?.id, 'Review KYC', 'system', { targetUser: id, status });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/reconcile-wallet/:userId
router.post("/reconcile-wallet/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const walletRes = await ledgerPool.query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
    if (walletRes.rows.length === 0) return res.status(404).json({ error: 'Wallet not found' });
    
    const walletId = walletRes.rows[0].id;

    const history = await ledgerPool.query("SELECT sum(amount) as total FROM ledger_transactions WHERE wallet_id = $1 AND status = 'success'", [walletId]);
    const correctBalance = parseFloat(history.rows[0].total || 0);
    
    await ledgerPool.query('UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [correctBalance, walletId]);
    await auditLog((req as any).user?.id, 'Reconcile Wallet', 'finance', { targetUser: userId, newBalance: correctBalance });
    res.json({ success: true, new_balance: correctBalance });
  } catch (error) {
    res.status(500).json({ error: 'Reconciliation failed' });
  }
});

// GET /api/admin/users/:id/usage
router.get("/:id/usage", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM user_usage WHERE user_id = $1 ORDER BY usage_date DESC LIMIT 100', [id]);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// GET /api/admin/users/:id/activity-logs
router.get("/:id/activity-logs", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM system_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [id]);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// Legacy paths / additional permissions management
router.get("/:id/permissions", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        u.role, u.status, u.kyc_status, u.kyc_required, u.kyc_rejection_reason,
        s.status as subscription_status
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      WHERE u.id = $1
    `, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.patch("/:id/permissions", async (req, res) => {
  // Logic already covered in PUT /:id but kept for compatibility if needed
  try {
    const { id } = req.params;
    const { role, status, kyc_status, kyc_rejection_reason, kyc_required } = req.body;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updates = [];
      const values: any[] = [id];
      let valIdx = 2;
      if (role) { updates.push(`role = $${valIdx++}`); values.push(role); }
      if (status) { updates.push(`status = $${valIdx++}`); values.push(status); }
      if (kyc_status) { updates.push(`kyc_status = $${valIdx++}`); values.push(kyc_status); }
      if (kyc_rejection_reason !== undefined) { updates.push(`kyc_rejection_reason = $${valIdx++}`); values.push(kyc_rejection_reason); }
      if (kyc_required !== undefined) { updates.push(`kyc_required = $${valIdx++}`); values.push(kyc_required); }

      if (updates.length > 0) {
        await client.query(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, values);
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
