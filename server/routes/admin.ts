import express from 'express';
import Stripe from 'stripe';
import { pool, ledgerPool } from '../db/index.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { syncProviderModelsInternal, checkProviderStatus, invalidateVaultCache } from '../services/ai.js';
import { tools } from '../config/constants.js';
import { runDatabaseMigrations } from '../db/migrations.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { invalidateStripeClient } from '../services/payments.js';
import { 
  getDatabaseRegistry, 
  saveDatabaseConfig, 
  testDatabaseConnection, 
  exportDatabase, 
  importDatabase, 
  initAllTools, 
  getAdminStats,
  getServerHealth
} from '../services/admin.js';

const router = express.Router();

async function auditLog(userId: any, action: string, type: string, details: object) {
  try {
    await pool.query(
      'INSERT INTO system_logs (user_id, action, type, details) VALUES ($1, $2, $3, $4)',
      [userId, action, type, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('[AuditLog] Failed to record activity:', error);
  }
}

router.get("/health", authenticateAdmin, async (req, res) => {
  try {
    const health = await getServerHealth();
    res.json(health);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/databases/registry", authenticateAdmin, async (req, res) => {
  try {
    const registry = await getDatabaseRegistry();
    res.json(registry);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/databases/save", authenticateAdmin, async (req, res) => {
  try {
    const result = await saveDatabaseConfig(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/databases/test", authenticateAdmin, async (req, res) => {
  try {
    const config = req.body.config || req.body;
    if (!config.host && !config.connection_string && !config.connectionString) {
      return res.status(400).json({ error: 'Host or connection string is required' });
    }
    const result = await testDatabaseConnection(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

router.post("/databases/migrate", authenticateAdmin, async (req, res) => {
  try {
    const { type } = req.body;
    await runDatabaseMigrations(type || 'additive');
    await auditLog((req as any).user?.id, 'Run Database Migrations', 'system', { type });
    res.json({ success: true, message: 'Migrations completed' });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get("/databases/export", authenticateAdmin, async (req, res) => {
  try {
    const backup = await exportDatabase(req.query.type as any);
    res.json(backup);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/databases/import", authenticateAdmin, async (req, res) => {
  try {
    const { backup, targetType } = req.body;
    if (!backup || typeof backup !== 'object') return res.status(400).json({ error: 'Invalid backup payload' });
    if (!targetType) return res.status(400).json({ error: 'targetType is required' });
    const result = await importDatabase(backup, targetType);
    await auditLog((req as any).user?.id, 'Import Database', 'system', { targetType });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get("/api-keys", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT provider, updated_at, daily_budget, used_today, models, is_active FROM api_keys_vault');
    res.json({ keys: result.rows });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/orchestrator/init-all", authenticateAdmin, async (req, res) => {
  try {
    const result = await initAllTools();
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to initialize' });
  }
});

router.get("/plans", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM plans ORDER BY monthly_price ASC');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/plans", authenticateAdmin, async (req, res) => {
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

router.put("/plans/:id", authenticateAdmin, async (req, res) => {
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

router.delete("/plans/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM plans WHERE id = $1', [id]);
    await auditLog((req as any).user?.id, 'Delete Plan', 'system', { id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.name, u.email, u.role, u.status, u.created_at, u.last_active_at,
        u.kyc_status, u.kyc_required, u.support_notes, u.kyc_rejection_reason, u.custom_limits,
        s.plan_id, s.status as subscription_status, s.current_period_end,
        p.name_en as plan_name
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      LEFT JOIN plans p ON s.plan_id = p.id
      ORDER BY u.created_at DESC
    `);
    
    let walletMap = new Map();
    try {
      const targetLedger = ledgerPool || pool;
      const walletRes = await targetLedger.query('SELECT user_id, balance, points FROM wallets');
      walletMap = new Map(walletRes.rows.map((row: any) => [row.user_id, row]));
    } catch (e) {
      console.error('[Admin] Failed to fetch wallets for user list:', e);
    }

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
    console.error('[Admin] Failed to fetch users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.patch("/users/:id/status", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const userIdNum = parseInt(id, 10);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid User ID format' });
    }

    await pool.query('UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, userIdNum]);
    await auditLog((req as any).user?.id, 'Update User Status', 'system', { targetUser: userIdNum, status });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Admin] Failed to update user status:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

router.patch("/users/:id/role", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (!['admin', 'user', 'support', 'elite'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const userIdNum = parseInt(id, 10);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid User ID format' });
    }

    await pool.query('UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [role, userIdNum]);
    await auditLog((req as any).user?.id, 'Update User Role', 'system', { targetUser: userIdNum, role });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Admin] Failed to update user role:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

router.get("/orchestrator/routes", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tool_orchestrator ORDER BY tool_id ASC');
    res.json({ routes: result.rows, tools: result.rows });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/orchestrator/routes", authenticateAdmin, async (req, res) => {
  try {
    const rawRoutes = req.body.routes || [req.body];
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const route of rawRoutes) {
        const { 
          tool_id, primary_provider, primary_model, 
          fallback_1_provider, fallback_1_model, 
          fallback_2_provider, fallback_2_model,
          fallback_3_provider, fallback_3_model,
          is_active, cost_per_usage 
        } = route;
        
        if (!tool_id) continue;

        await client.query(`
          INSERT INTO tool_orchestrator (
            tool_id, primary_provider, primary_model, 
            fallback_1_provider, fallback_1_model, 
            fallback_2_provider, fallback_2_model,
            fallback_3_provider, fallback_3_model,
            is_active, cost_per_usage
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (tool_id) DO UPDATE SET
            primary_provider = EXCLUDED.primary_provider,
            primary_model = EXCLUDED.primary_model,
            fallback_1_provider = EXCLUDED.fallback_1_provider,
            fallback_1_model = EXCLUDED.fallback_1_model,
            fallback_2_provider = EXCLUDED.fallback_2_provider,
            fallback_2_model = EXCLUDED.fallback_2_model,
            fallback_3_provider = EXCLUDED.fallback_3_provider,
            fallback_3_model = EXCLUDED.fallback_3_model,
            is_active = EXCLUDED.is_active,
            cost_per_usage = EXCLUDED.cost_per_usage,
            updated_at = CURRENT_TIMESTAMP
        `, [
          tool_id, 
          primary_provider || '', primary_model || '', 
          fallback_1_provider || '', fallback_1_model || '', 
          fallback_2_provider || '', fallback_2_model || '',
          fallback_3_provider || '', fallback_3_model || '',
          is_active !== undefined ? is_active : true, 
          cost_per_usage || 10
        ]);
      }
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/orchestrator/models", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT provider, models FROM api_keys_vault');
    const models: any = {};
    result.rows.forEach((row: any) => {
      models[row.provider] = typeof row.models === 'string' ? JSON.parse(row.models) : row.models;
    });
    res.json({ providerModels: models });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/broadcasts", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_broadcasts ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/broadcasts/send", authenticateAdmin, async (req, res) => {
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

router.get("/stats", authenticateAdmin, async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/security-alerts", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM security_alerts ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/activity-stream", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/users", authenticateAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'user', balance = 0, points = 0 } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const check = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.default.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const newUser = await client.query(
        `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
        [name, email, hash, role]
      );
      const userId = newUser.rows[0].id;

      const ledgerTarget = ledgerPool || pool;
      await ledgerTarget.query(
        `INSERT INTO wallets (user_id, balance, points) VALUES ($1, $2, $3)`,
        [userId, balance, points]
      );

      await client.query('COMMIT');
      await auditLog((req as any).user?.id, 'Create User Manually', 'system', { targetUser: userId, email });
      res.json({ success: true, userId });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Admin] Create user failed:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.delete("/users/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = (req as any).user?.id;

    if (id === adminId?.toString()) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Cascade delete is handled by DB for chats, messages, user_files, etc.
      // But wallets/ledger might be in another DB
      if (ledgerPool && ledgerPool !== pool) {
        await ledgerPool.query('DELETE FROM wallets WHERE user_id = $1', [id]);
        await ledgerPool.query('DELETE FROM referrals WHERE referrer_id = $1 OR referred_id = $1', [id, id]);
      } else {
        await client.query('DELETE FROM wallets WHERE user_id = $1', [id]);
        await client.query('DELETE FROM referrals WHERE referrer_id = $1 OR referred_id = $1', [id, id]);
      }

      await client.query('DELETE FROM users WHERE id = $1', [id]);

      await client.query('COMMIT');
      await auditLog(adminId, 'Delete User', 'system', { targetUser: id });
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Admin] Delete user failed:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get("/users/:id/permissions", authenticateAdmin, async (req, res) => {
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

router.patch("/users/:id/permissions", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status, kyc_status, kyc_rejection_reason, kyc_required, custom_limits } = req.body;
    
    if (role && !['admin', 'user', 'support', 'elite'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (status && !['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (kyc_status && !['none', 'pending', 'verified', 'rejected'].includes(kyc_status)) {
      return res.status(400).json({ error: 'Invalid kyc_status' });
    }

    const userIdNum = parseInt(id, 10);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid User ID format' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const userUpdates = [];
      const userValues: any[] = [userIdNum];
      let valIdx = 2;

      if (role) { userUpdates.push(`role = $${valIdx++}`); userValues.push(role); }
      if (status) { userUpdates.push(`status = $${valIdx++}`); userValues.push(status); }
      if (kyc_status) { userUpdates.push(`kyc_status = $${valIdx++}`); userValues.push(kyc_status); }
      if (kyc_rejection_reason !== undefined) { userUpdates.push(`kyc_rejection_reason = $${valIdx++}`); userValues.push(kyc_rejection_reason); }
      if (kyc_required !== undefined) { userUpdates.push(`kyc_required = $${valIdx++}`); userValues.push(kyc_required); }
      if (custom_limits !== undefined) { userUpdates.push(`custom_limits = $${valIdx++}`); userValues.push(custom_limits); }

      if (userUpdates.length > 0) {
        await client.query(`UPDATE users SET ${userUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, userValues);
      }

      // Sync KYC status to Ledger DB
      if (kyc_status) {
        const { syncKYCStatus } = await import('../services/kyc.js');
        await syncKYCStatus(userIdNum, kyc_status, kyc_rejection_reason || null, client);
      }

      await client.query('COMMIT');
      await auditLog((req as any).user?.id, 'Update User Permissions', 'system', { targetUser: userIdNum, changes: { role, status, kyc_status } });
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Admin] Failed to update user permissions:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

router.patch("/users/:id/kyc-status", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { kyc_required } = req.body;
    const userIdNum = parseInt(id, 10);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid User ID format' });
    }
    await pool.query('UPDATE users SET kyc_required = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [kyc_required, userIdNum]);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Admin] Failed to update KYC status:', error);
    res.status(500).json({ error: 'Failed to update KYC status' });
  }
});

router.patch("/users/:id/kyc-verification", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { kyc_status, rejection_reason } = req.body;
    
    const userIdNum = parseInt(id, 10);
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: 'Invalid User ID format' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { syncKYCStatus } = await import('../services/kyc.js');
      await syncKYCStatus(userIdNum, kyc_status, rejection_reason || null, client);
      
      await client.query(`
        UPDATE users SET 
          kyc_status = $1, 
          kyc_rejection_reason = $2, 
          kyc_required = CASE WHEN $1 = 'verified' THEN false ELSE kyc_required END,
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = $3
      `, [kyc_status, rejection_reason || null, userIdNum]);

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Admin] Failed to update verification status:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

router.post("/users/:id/balance", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason, type, unit } = req.body;
    
    const target = (unit === 'PTS' || unit === 'points') ? 'points' : 'balance';
    const { adjustWalletBalance } = await import('../services/wallet.js');
    const result = await adjustWalletBalance(id, amount, type, reason || 'Admin adjustment', target);
    
    await auditLog((req as any).user?.id, 'Adjust Balance', 'finance', { targetUser: id, amount, type, unit, reason });
    res.json({ success: true, newBalance: result.newBalance, newPoints: result.newPoints });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to adjust balance' });
  }
});

router.patch("/users/:id/support-notes", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    await pool.query('UPDATE users SET support_notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [notes, id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to update support notes' });
  }
});

router.post("/users/:id/send-email", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body } = req.body;
    
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    // For now, we log the email request. In a real system, you'd use a mail service.
    await auditLog((req as any).user?.id, 'Send Manual Email', 'communication', { 
      targetUser: id, 
      targetEmail: userRes.rows[0].email,
      subject 
    });
    
    console.log(`[Admin Email] To: ${userRes.rows[0].email}, Subject: ${subject}`);
    
    res.json({ success: true, message: 'Email sent (simulated)' });
  } catch {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.post("/users/:id/notify", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { titleEn, titleAr, messageEn, messageAr, type } = req.body;
    
    await pool.query(`
      INSERT INTO notifications (user_id, title_en, title_ar, message_en, message_ar, type)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, titleEn, titleAr, messageEn, messageAr, type || 'system']);
    
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

router.patch("/users/:id/plan", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { planId } = req.body;
    
    const planRes = await pool.query('SELECT id FROM plans WHERE id = $1', [planId]);
    if (planRes.rows.length === 0) return res.status(400).json({ error: 'Invalid plan ID' });

    await pool.query(`
      INSERT INTO subscriptions (user_id, plan_id, status, updated_at)
      VALUES ($1, $2, 'active', CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE SET 
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
    `, [id, planId]);
    
    await auditLog((req as any).user?.id, 'Update User Plan', 'system', { targetUser: id, planId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

router.get("/users/:id/usage", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM user_usage WHERE user_id = $1 ORDER BY usage_date DESC LIMIT 100', [id]);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/users/:id/activity-logs", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM system_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [id]);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/financial-radar", authenticateAdmin, async (req, res) => {
  try {
    const totalBalance = await ledgerPool.query('SELECT sum(balance) as total FROM wallets');
    const totalTransactions = await ledgerPool.query('SELECT count(*) FROM ledger_transactions');
    const recentVolume = await ledgerPool.query("SELECT sum(amount) as total FROM ledger_transactions WHERE created_at > now() - interval '24 hours'");
    
    const recentTx = await ledgerPool.query('SELECT * FROM ledger_transactions ORDER BY created_at DESC LIMIT 50');
    
    let transactions = recentTx.rows;
    try {
      const userIds = [...new Set(transactions.map((t: any) => t.user_id))];
      if (userIds.length > 0) {
        const usersRes = await pool.query('SELECT id, name FROM users WHERE id = ANY($1)', [userIds]);
        const userMap = new Map(usersRes.rows.map((u: any) => [u.id, u.name]));
        transactions = transactions.map((t: any) => ({
          ...t,
          user_name: userMap.get(t.user_id) || 'Unknown User'
        }));
      }
    } catch (uErr) {
      console.error('[Admin] Failed to enrich transactions with user names:', uErr);
    }

    res.json({
      stats: {
        total_liquidity: parseFloat(totalBalance.rows[0].total || 0),
        transaction_count: parseInt(totalTransactions.rows[0].count),
        volume_24h: parseFloat(recentVolume.rows[0].total || 0),
        health_score: 100
      },
      transactions
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get("/wallet-diagnostics", authenticateAdmin, async (req, res) => {
  try {
    const walletData = await ledgerPool.query('SELECT * FROM wallets WHERE balance < 0');
    
    let anomalies = walletData.rows;
    
    try {
      const userIds = anomalies.map((w: any) => w.user_id);
      if (userIds.length > 0) {
        const usersRes = await pool.query('SELECT id, name, email FROM users WHERE id = ANY($1)', [userIds]);
        const userMap = new Map(usersRes.rows.map((u: any) => [u.id, u]));
        anomalies = anomalies.map((w: any) => {
          const user = userMap.get(w.user_id) as any;
          return {
            ...w,
            user: user ? { id: user.id, name: user.name, email: user.email } : null
          };
        });
      }
    } catch (uErr) {
      console.error('[Admin] Failed to enrich wallet anomalies:', uErr);
    }
    
    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get("/wallet-alerts", authenticateAdmin, async (req, res) => {
  try {
    const alerts = await ledgerPool.query(`
      SELECT * FROM ledger_transactions 
      WHERE amount > 1000 OR transaction_type = 'system_adjustment'
      ORDER BY created_at DESC LIMIT 20
    `);
    res.json(alerts.rows);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/reconcile-wallet/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const walletRes = await ledgerPool.query('SELECT id FROM wallets WHERE user_id = $1', [id]);
    if (walletRes.rows.length === 0) return res.status(404).json({ error: 'Wallet not found' });
    
    const walletId = walletRes.rows[0].id;

    const history = await ledgerPool.query("SELECT sum(amount) as total FROM ledger_transactions WHERE wallet_id = $1 AND status = 'success'", [walletId]);
    const correctBalance = parseFloat(history.rows[0].total || 0);
    
    await ledgerPool.query('UPDATE wallets SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [correctBalance, walletId]);
    await auditLog((req as any).user?.id, 'Reconcile Wallet', 'finance', { targetUser: id, newBalance: correctBalance });
    res.json({ success: true, new_balance: correctBalance });
  } catch (error) {
    res.status(500).json({ error: 'Reconciliation failed' });
  }
});

router.post("/activity/batch-delete", authenticateAdmin, async (req, res) => {
  try {
    const { ids, type } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs array required' });
    
    if (type === 'financial') {
      await ledgerPool.query('DELETE FROM ledger_transactions WHERE id = ANY($1)', [ids]);
    } else {
      const validTables: Record<string, string> = { alert: 'security_alerts', log: 'system_logs' };
      const table = validTables[type];
      if (!table) return res.status(400).json({ error: 'Invalid type' });
      await pool.query(`DELETE FROM ${table} WHERE id = ANY($1)`, [ids]);
    }
    await auditLog((req as any).user?.id, 'Batch Delete Activity', 'system', { type, count: ids.length });
    res.json({ success: true, count: ids.length });
  } catch {
    res.status(500).json({ error: 'Batch delete failed' });
  }
});

router.delete("/financial/all", authenticateAdmin, async (req, res) => {
  try {
    const countRes = await ledgerPool.query('SELECT COUNT(*) FROM ledger_transactions');
    await ledgerPool.query('DELETE FROM ledger_transactions');
    await auditLog((req as any).user?.id, 'Purge All Financial Transactions', 'finance', { deletedCount: parseInt(countRes.rows[0].count) });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Purge failed' });
  }
});

router.delete("/activity/:id/:type", authenticateAdmin, async (req, res) => {
  try {
    const { id, type } = req.params;
    const validTables: Record<string, string> = { alert: 'security_alerts', log: 'system_logs' };
    const table = validTables[type];
    if (!table) return res.status(400).json({ error: 'Invalid type' });
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.delete("/activity/all/:type", authenticateAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    const adminId = (req as any).user?.id;

    if (type === 'ai_generation' || type === 'ai') {
      await pool.query("DELETE FROM system_logs WHERE type = 'ai_generation'");
      await auditLog(adminId, 'Clear AI Generation Logs', 'system', { type });
    } else if (type === 'system_event' || type === 'system') {
      await pool.query("DELETE FROM system_logs WHERE type != 'ai_generation'");
      await auditLog(adminId, 'Clear System Event Logs', 'system', { type });
    } else if (type === 'alert') {
      await pool.query('DELETE FROM security_alerts');
      await auditLog(adminId, 'Clear Security Alerts', 'system', { type });
    } else if (type === 'log') {
      await pool.query('DELETE FROM system_logs');
      await auditLog(adminId, 'Clear All System Logs', 'system', { type });
    } else {
      return res.status(400).json({ error: 'Invalid type. Use: ai, system, alert, or log' });
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

router.delete("/security-alerts/all", authenticateAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM security_alerts');
    await auditLog((req as any).user?.id, 'Clear All Security Alerts', 'system', {});
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

router.delete("/security-alerts/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM security_alerts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.delete("/notifications/prune", authenticateAdmin, async (req, res) => {
  try {
    const days = req.query.days as string;
    const mode = req.query.mode as string;

    if (mode === 'all') {
      const result = await pool.query('DELETE FROM notifications');
      await auditLog((req as any).user?.id, 'Prune All Notifications', 'system', {});
      return res.json({ success: true, count: result.rowCount });
    }

    const daysNum = parseInt(days) || 30;
    const result = await pool.query("DELETE FROM notifications WHERE is_read = true AND created_at < now() - interval '1 day' * $1", [daysNum]);
    res.json({ success: true, count: result.rowCount });
  } catch {
    res.status(500).json({ error: 'Prune failed' });
  }
});

router.delete("/maintenance/clear-chats", authenticateAdmin, async (req, res) => {
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM chats');
    await pool.query('TRUNCATE TABLE messages CASCADE');
    await pool.query('DELETE FROM chats');
    await auditLog((req as any).user?.id, 'Clear All Chat History', 'system', { deletedChats: parseInt(countRes.rows[0].count) });
    res.json({ success: true, message: 'All AI history and chats cleared' });
  } catch {
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

router.delete("/ledger-transactions/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await ledgerPool.query('DELETE FROM ledger_transactions WHERE id = $1', [id]);
    await auditLog((req as any).user?.id, 'Delete Ledger Transaction', 'finance', { transactionId: id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.get("/economy", authenticateAdmin, async (req, res) => {
  try {
    const { getEconomySettings } = await import('../services/wallet.js');
    const settings = await getEconomySettings();
    res.json(settings);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/economy", authenticateAdmin, async (req, res) => {
  try {
    const { 
      points_per_dollar = 1000, 
      min_payout_usd = 10, 
      min_deposit_usd = 5, 
      referral_bonus_percent = 10, 
      welcome_bonus_points = 600, 
      referral_bonus_points = 1000, 
      conversion_rate = 0.001,
      referral_activation_min_deposit = 10
    } = req.body;

    const min_withdrawal_cents = Math.round(min_payout_usd * 100);

    // Ledger DB is the Source of Truth for Economy Settings
    const ledgerTarget = ledgerPool || pool;
    try {
      const ledgerCheck = await ledgerTarget.query('SELECT count(*) FROM economy_settings');
      if (parseInt(ledgerCheck.rows[0].count) > 0) {
        await ledgerTarget.query(`
          UPDATE economy_settings SET 
            points_per_dollar = $1, 
            min_payout_usd = $2, 
            min_deposit_usd = $3, 
            referral_bonus_percent = $4,
            welcome_bonus_points = $5, 
            referral_bonus_points = $6, 
            conversion_rate = $7, 
            min_withdrawal_cents = $8,
            referral_activation_min_deposit = $9,
            updated_at = CURRENT_TIMESTAMP
        `, [
          points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
          welcome_bonus_points, referral_bonus_points, conversion_rate, min_withdrawal_cents,
          referral_activation_min_deposit
        ]);
      } else {
        await ledgerTarget.query(`
          INSERT INTO economy_settings (
            points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
            welcome_bonus_points, referral_bonus_points, conversion_rate, min_withdrawal_cents,
            referral_activation_min_deposit
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
          welcome_bonus_points, referral_bonus_points, conversion_rate, min_withdrawal_cents,
          referral_activation_min_deposit
        ]);
      }
    } catch (ledgerErr) {
      console.warn('[Admin] Failed to update economy settings in Ledger:', ledgerErr);
      return res.status(500).json({ error: 'Failed to update finance settings' });
    }

    const { clearEconomyCache } = await import('../services/wallet.js');
    clearEconomyCache();
    
    await auditLog((req as any).user?.id, 'Update Economy Settings', 'finance', req.body);
    res.json({ success: true, message: 'Finance settings updated successfully' });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/settings/stripe", authenticateAdmin, async (req, res) => {
  try {
    const { secretKey, publishableKey, webhookSecret, isLiveMode } = req.body;
    
    // Build query dynamically to avoid overwriting existing keys if not provided
    let query = 'UPDATE system_settings SET updated_at = CURRENT_TIMESTAMP';
    const params: any[] = [];
    let paramCount = 1;

    if (publishableKey !== undefined && publishableKey !== '') {
      query += `, stripe_publishable_key = $${paramCount++}`;
      params.push(encrypt(publishableKey));
    }
    if (secretKey !== undefined && secretKey !== '') {
      query += `, stripe_secret_key = $${paramCount++}`;
      params.push(encrypt(secretKey));
    }
    if (webhookSecret !== undefined && webhookSecret !== '') {
      query += `, stripe_webhook_secret = $${paramCount++}`;
      params.push(encrypt(webhookSecret));
    }
    if (isLiveMode !== undefined) {
      query += `, stripe_live_mode = $${paramCount++}`;
      params.push(isLiveMode);
    }

    query += `, stripe_status = 'verified', stripe_last_verified_at = CURRENT_TIMESTAMP`;

    await pool.query(query, params);
    
    await auditLog((req as any).user?.id, 'Update Stripe Settings', 'finance', { isLiveMode, publishableKey: '***' });
    invalidateStripeClient();
    res.json({ success: true });
  } catch (error) {
    console.error('[Admin] Stripe settings update failed:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.post("/settings/stripe/verify", authenticateAdmin, async (req, res) => {
  try {
    const settings = await pool.query('SELECT stripe_secret_key FROM system_settings LIMIT 1');
    if (!settings.rows[0]?.stripe_secret_key) {
      return res.status(400).json({ error: 'Stripe secret key not configured' });
    }

    const secretKey = decrypt(settings.rows[0].stripe_secret_key);
    const stripe = new Stripe(secretKey, { apiVersion: '2025-01-27.acacia' as any });
    
    await stripe.balance.retrieve();
    
    await pool.query('UPDATE system_settings SET stripe_status = $1, stripe_last_verified_at = CURRENT_TIMESTAMP', ['verified']);
    res.json({ success: true, message: 'Verified successfully' });
  } catch {
    res.status(400).json({ error: 'Verification failed' });
  }
});

router.post("/api-keys", authenticateAdmin, async (req, res) => {
  try {
    const { provider, key, daily_budget = 0, urlKey } = req.body;
    if (!provider || !key) return res.status(400).json({ error: 'Provider and Key are required' });

    let finalKey = key;
    if (provider.toLowerCase() === 'ollama' && urlKey) {
      finalKey = `${urlKey}:${key}`;
    }

    const status = await checkProviderStatus(provider, finalKey);
    if (!status.isValid) {
      return res.status(400).json({ 
        error: 'Invalid API Key', 
        details: status.message || 'Connecting to provider failed. Please check your key.' 
      });
    }

    const encryptedKey = encrypt(finalKey);
    
    await pool.query(`
      INSERT INTO api_keys_vault (provider, encrypted_key, daily_budget, is_active, updated_at)
      VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
      ON CONFLICT (provider) DO UPDATE SET 
        encrypted_key = EXCLUDED.encrypted_key,
        daily_budget = EXCLUDED.daily_budget,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
    `, [provider.toLowerCase(), encryptedKey, daily_budget]);

    invalidateVaultCache(provider);

    let syncedCount = 0;
    let syncedModels: any[] = [];
    try {
      const syncResult = await syncProviderModelsInternal(provider.toLowerCase(), finalKey);
      syncedCount = syncResult.count;
      syncedModels = syncResult.models;
    } catch (syncErr) {
      console.error('[Admin] Post-save model sync failed:', syncErr);
    }

    await auditLog((req as any).user?.id, 'Save API Key', 'system', { provider: provider.toLowerCase() });
    res.json({ success: true, count: syncedCount, models: syncedModels, status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

router.post("/api-keys/:id/budget", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { budget } = req.body;
    if (budget === undefined || isNaN(Number(budget))) return res.status(400).json({ error: 'Valid budget required' });
    await pool.query('UPDATE api_keys_vault SET daily_budget = $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2', [budget, id]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
});

router.delete("/api-keys/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM api_keys_vault WHERE provider = $1', [id]);
    await auditLog((req as any).user?.id, 'Delete API Key', 'system', { provider: id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.post("/api-keys/:id/sync-models", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const keyResult = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [id]);
    if (keyResult.rows.length === 0) return res.status(404).json({ error: 'Provider key not found' });
    
    const decryptedKey = decrypt(keyResult.rows[0].encrypted_key);
    const syncResult = await syncProviderModelsInternal(id, decryptedKey);
    res.json({ success: true, count: syncResult.count, models: syncResult.models });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/api-keys/:id/sync-usage", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const keyResult = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [id]);
    if (keyResult.rows.length === 0) return res.status(404).json({ error: 'Key not found' });
    
    const decryptedKey = decrypt(keyResult.rows[0].encrypted_key);
    const status = await checkProviderStatus(id, decryptedKey);
    
    await pool.query('UPDATE api_keys_vault SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2', [status.isValid, id]);
    res.json({ success: true, status });
  } catch {
    res.status(500).json({ error: 'Sync failed' });
  }
});

router.post("/api-keys/:id/test", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { key, urlKey } = req.body;
    
    let keyToTest = key;
    if (keyToTest) {
      if (id.toLowerCase() === 'ollama' && urlKey) {
        keyToTest = `${urlKey}:${keyToTest}`;
      }
    } else {
      // Fallback to saved key
      const keyResult = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [id]);
      if (keyResult.rows.length > 0) {
        keyToTest = decrypt(keyResult.rows[0].encrypted_key);
      }
    }

    if (!keyToTest) return res.status(400).json({ error: 'No key provided for testing' });
    
    const status = await checkProviderStatus(id, keyToTest);
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: 'Test failed' });
  }
});

export default router;