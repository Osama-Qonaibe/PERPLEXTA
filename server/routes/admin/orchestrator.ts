import { Router } from "express";
import { pool } from "../../db/index.js";
import { authenticate, adminOnly } from "../../middleware/auth.js";
import { 
  syncProviderModelsInternal 
} from "../../services/ai.js";
import { 
  initAllTools as initToolsService 
} from "../../services/admin.js";
import { decrypt } from "../../utils/crypto.js";

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

// GET /api/admin/orchestrator (Returns all routes)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tool_orchestrator ORDER BY tool_id ASC');
    res.json({ routes: result.rows, tools: result.rows });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// GET /api/admin/orchestrator/routes
router.get("/routes", async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tool_orchestrator ORDER BY tool_id ASC');
    res.json({ routes: result.rows, tools: result.rows });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// POST or PUT /api/admin/orchestrator
router.post("/", async (req, res) => {
  try {
    const rawRoutes = req.body.routes || [req.body];
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const route of rawRoutes) {
        const { 
          tool_id, primary_provider, primary_model, 
          fallback1_provider, fallback1_model, 
          fallback2_provider, fallback2_model,
          fallback3_provider, fallback3_model,
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
          fallback1_provider || '', fallback1_model || '', 
          fallback2_provider || '', fallback2_model || '',
          fallback3_provider || '', fallback3_model || '',
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

router.put("/", async (req, res) => {
  // Use same logic as POST for PUT compatibility
  const rawRoutes = req.body.routes || [req.body];
  try {
     const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const route of rawRoutes) {
          const { tool_id, primary_provider, primary_model, is_active, cost_per_usage } = route;
          if (!tool_id) continue;
          await client.query(`UPDATE tool_orchestrator SET primary_provider=$1, primary_model=$2, is_active=$3, cost_per_usage=$4, updated_at=CURRENT_TIMESTAMP WHERE tool_id=$5`, 
          [primary_provider, primary_model, is_active, cost_per_usage, tool_id]);
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
    res.status(500).json({ error: 'Update failed' });
  }
});

// GET /api/admin/orchestrator/models
router.get("/models", async (req, res) => {
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

// POST /api/admin/orchestrator/test (Mapping to init-all)
router.post("/test", async (req, res) => {
  try {
    const result = await initToolsService();
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to initialize' });
  }
});

router.post("/init-all", async (req, res) => {
  try {
    const result = await initToolsService();
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to initialize' });
  }
});

// POST /api/admin/orchestrator/sync-all
router.post("/sync-all", async (req, res) => {
  try {
    const result = await pool.query('SELECT provider, encrypted_key FROM api_keys_vault WHERE is_active = true');
    const syncResults = [];
    
    for (const row of result.rows) {
      try {
        const decryptedKey = decrypt(row.encrypted_key);
        const syncResult = await syncProviderModelsInternal(row.provider, decryptedKey);
        syncResults.push({ provider: row.provider, success: true, count: syncResult.count });
      } catch (err) {
        syncResults.push({ provider: row.provider, success: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    
    await auditLog((req as any).user?.id, 'Global Sync AI Models', 'system', { results: syncResults });
    res.json({ success: true, results: syncResults });
  } catch (error) {
    res.status(500).json({ error: 'Global sync failed' });
  }
});

export default router;
