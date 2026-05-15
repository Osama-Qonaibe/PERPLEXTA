import express from 'express';
import { pool } from '../../db/index.js';
import { authenticateAdmin } from '../../middleware/auth.js';
import { 
  getDatabaseRegistry, 
  saveDatabaseConfig, 
  testDatabaseConnection, 
  exportDatabase, 
  importDatabase 
} from '../../services/admin.js';
import { runDatabaseMigrations } from '../../db/migrations.js';
import { auditLog } from '../../utils/logger.js';
import { encrypt, decrypt } from '../../utils/crypto.js';
import { 
  syncProviderModelsInternal, 
  checkProviderStatus, 
  invalidateVaultCache 
} from '../../services/ai.js';
import { invalidateStripeClient } from '../../services/payments.js';

const router = express.Router();

// --- Database Routes ---

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
    const { host, port, database, user } = req.body;
    if (!host || !database) return res.status(400).json({ error: 'host and database are required' });
    const result = await testDatabaseConnection(req.body);
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
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

// --- API Keys Routes ---

router.get("/api-keys", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT provider, updated_at, daily_budget, used_today, models, is_active FROM api_keys_vault');
    res.json({ keys: result.rows });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
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
    } catch {}

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

// --- Stripe Settings ---

router.post("/settings/stripe", authenticateAdmin, async (req, res) => {
  try {
    const { secretKey, publishableKey, webhookSecret, isLiveMode } = req.body;
    const encryptedSecret = secretKey ? encrypt(secretKey) : null;
    const encryptedWebhook = webhookSecret ? encrypt(webhookSecret) : null;
    
    await pool.query(`
      UPDATE system_settings SET 
        stripe_secret_key = $1, stripe_publishable_key = $2, stripe_webhook_secret = $3, stripe_live_mode = $4,
        stripe_status = 'verified', stripe_last_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    `, [encryptedSecret, publishableKey, encryptedWebhook, isLiveMode]);
    
    await auditLog((req as any).user?.id, 'Update Stripe Settings', 'finance', { isLiveMode, publishableKey });
    invalidateStripeClient();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
