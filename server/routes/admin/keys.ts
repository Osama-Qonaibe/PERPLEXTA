import { Router } from "express";
import { pool } from "../../db/index.js";
import { authenticate, adminOnly } from "../../middleware/auth.js";
import { encrypt, decrypt } from "../../utils/crypto.js";
import { 
  syncProviderModelsInternal, 
  checkProviderStatus, 
  invalidateVaultCache 
} from "../../services/ai.js";

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

// GET /api/admin/api-keys
router.get("/", async (req, res) => {
  try {
    const result = await pool.query('SELECT provider, updated_at, daily_budget, used_today, models, is_active FROM api_keys_vault');
    res.json({ keys: result.rows });
  } catch {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/api-keys
router.post("/", async (req, res) => {
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

// PUT /api/admin/api-keys/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params; // id is provider
    const { api_key, is_active, daily_budget } = req.body;
    
    const updates = [];
    const values = [];
    let idx = 1;

    if (api_key) {
      const encryptedKey = encrypt(api_key);
      updates.push(`encrypted_key = $${idx++}`);
      values.push(encryptedKey);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(is_active);
    }
    if (daily_budget !== undefined) {
      updates.push(`daily_budget = $${idx++}`);
      values.push(daily_budget);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    values.push(id.toLowerCase());
    await pool.query(`
      UPDATE api_keys_vault SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE provider = $${idx}
    `, values);

    invalidateVaultCache(id);
    await auditLog((req as any).user?.id, 'Update API Key', 'system', { provider: id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/admin/api-keys/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM api_keys_vault WHERE provider = $1', [id]);
    await auditLog((req as any).user?.id, 'Delete API Key', 'system', { provider: id });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// POST /api/admin/api-keys/:id/test
router.post("/:id/test", async (req, res) => {
  try {
    const { id } = req.params;
    const keyResult = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [id]);
    if (keyResult.rows.length === 0) return res.status(404).json({ error: 'Provider key not found' });
    
    const decryptedKey = decrypt(keyResult.rows[0].encrypted_key);
    const status = await checkProviderStatus(id, decryptedKey);
    
    await pool.query('UPDATE api_keys_vault SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2', [status.isValid, id]);
    res.json({ success: true, status });
  } catch {
    res.status(500).json({ error: 'Test failed' });
  }
});

// Legacy paths support
router.post("/:id/sync-models", async (req, res) => {
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

router.post("/:id/sync-usage", async (req, res) => {
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

router.post("/:id/budget", async (req, res) => {
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

export default router;
