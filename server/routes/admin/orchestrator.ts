import express from 'express';
import { pool } from '../../db/index.js';
import { authenticateAdmin } from '../../middleware/auth.js';
import { initAllTools } from '../../services/admin.js';

const router = express.Router();

router.post("/init-all", authenticateAdmin, async (req, res) => {
  try {
    const result = await initAllTools();
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to initialize' });
  }
});

router.get("/routes", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tool_orchestrator ORDER BY tool_id ASC');
    res.json({ routes: result.rows, tools: result.rows });
  } catch {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/routes", authenticateAdmin, async (req, res) => {
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

router.get("/models", authenticateAdmin, async (req, res) => {
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

export default router;
