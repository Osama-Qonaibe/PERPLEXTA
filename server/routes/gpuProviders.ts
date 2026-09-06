import express from 'express';
import { pool } from '../db/index.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { 
  testGpuProviderHealth, 
  syncRemoteGpuModels, 
  invalidateGpuCache
} from '../services/gpuVaultService.js';
import { executeGpuVisionInference } from '../services/gpu/gpuInferenceAdapter.js';

const router = express.Router();

// Helper to mask key
function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

// 1. Get all GPU Providers
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        gp.id,
        gp.provider_id,
        gp.name,
        gp.provider_type,
        gp.endpoint_id,
        gp.base_url,
        gp.api_url,
        gp.current_load_capacity,
        gp.status,
        gp.metadata,
        gp.health_status,
        gp.latency_ms,
        gp.capabilities,
        gp.daily_budget,
        gp.used_today,
        gp.last_reset_date,
        gp.config,
        gp.is_active,
        gp.created_at,
        gp.updated_at,
        COUNT(gpm.id)::int as model_count
      FROM gpu_providers gp
      LEFT JOIN gpu_provider_models gpm ON gpm.provider_id = gp.id
      GROUP BY gp.id
      ORDER BY gp.created_at ASC
    `);

    res.json({
      success: true,
      providers: result.rows
    });
  } catch (error: any) {
    console.error('[GPU Providers] Fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Query available GPU models (Filtered by task_type, used by Orchestrator & Studio)
router.get('/models', authenticateAdmin, async (req, res) => {
  try {
    const { task_type } = req.query;
    let query = `
      SELECT 
        gpm.id,
        gpm.model_id,
        gpm.name,
        gpm.task_type,
        gpm.context_window,
        gpm.max_output_tokens,
        gpm.is_active,
        gp.provider_id,
        gp.id as provider_pk,
        gp.provider_id as provider_slug,
        gp.name as provider_name,
        gp.health_status,
        gp.latency_ms
      FROM gpu_provider_models gpm
      JOIN gpu_providers gp ON gp.id = gpm.provider_id
      WHERE gp.is_active = true AND gpm.is_active = true
    `;
    const params: any[] = [];

    if (task_type && typeof task_type === 'string') {
      params.push(task_type);
      query += ` AND gpm.task_type = $${params.length}`;
    }

    query += ` ORDER BY gp.name ASC, gpm.name ASC`;

    const result = await pool.query(query, params);
    res.json({
      success: true,
      models: result.rows
    });
  } catch (error: any) {
    console.error('[GPU Models] Fetch error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Register a new GPU Provider
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      provider_id,
      name,
      provider_type,
      endpoint_id,
      base_url,
      api_url,
      api_key,
      current_load_capacity = 100,
      status = 'active',
      metadata = {},
      capabilities = ['vision'],
      daily_budget = 0,
      config = {}
    } = req.body;

    const resolvedUrl = (base_url || api_url || '').trim();

    if (!provider_id || !name || !resolvedUrl) {
      return res.status(400).json({
        success: false,
        error: 'provider_id, name, and api_url/base_url are strictly required'
      });
    }

    const cleanId = provider_id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const encryptedKey = api_key ? encrypt(api_key.trim()) : '';
    const resolvedStatus = status || (req.body.is_active === false ? 'inactive' : 'active');
    const resolvedActive = req.body.is_active !== undefined ? Boolean(req.body.is_active) : (resolvedStatus !== 'inactive');
    const mergedMetadata = { ...config, ...metadata };

    // Pre-flight health check
    const pingTest = await testGpuProviderHealth(
      provider_type,
      resolvedUrl,
      endpoint_id,
      api_key || ''
    );

    const initialHealth = pingTest.status;
    const initialLatency = pingTest.latencyMs;

    const insertRes = await pool.query(
      `INSERT INTO gpu_providers 
        (provider_id, name, provider_type, endpoint_id, base_url, api_url, encrypted_api_key, current_load_capacity, status, metadata, health_status, latency_ms, capabilities, daily_budget, config, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id, provider_id, name, provider_type, endpoint_id, base_url, api_url, current_load_capacity, status, metadata, health_status, latency_ms, capabilities, daily_budget, config, is_active, created_at`,
      [cleanId, name.trim(), provider_type, endpoint_id?.trim() || null, resolvedUrl, resolvedUrl, encryptedKey, Number(current_load_capacity) || 100, resolvedStatus, mergedMetadata, initialHealth, initialLatency, capabilities, daily_budget, mergedMetadata, resolvedActive]
    );

    const newProvider = insertRes.rows[0];

    // If pre-flight detected models, insert them automatically
    if (pingTest.detectedModels && pingTest.detectedModels.length > 0) {
      for (const m of pingTest.detectedModels) {
        await pool.query(
          `INSERT INTO gpu_provider_models (provider_id, model_id, name, task_type)
           VALUES ($1, $2, $3, 'vision_analysis')
           ON CONFLICT DO NOTHING`,
          [newProvider.id, m.id, m.name || m.id]
        ).catch(() => {});
      }
    }

    invalidateGpuCache();

    res.status(201).json({
      success: true,
      provider: newProvider,
      pingTest
    });
  } catch (error: any) {
    console.error('[GPU Providers] Create error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Update GPU Provider
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      provider_type,
      endpoint_id,
      base_url,
      api_url,
      api_key,
      current_load_capacity,
      status,
      metadata,
      capabilities,
      daily_budget,
      config,
      is_active
    } = req.body;

    const existingRes = await pool.query('SELECT * FROM gpu_providers WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'GPU Provider not found' });
    }

    const current = existingRes.rows[0];
    let encryptedKey = current.encrypted_api_key;
    if (api_key && api_key.trim()) {
      encryptedKey = encrypt(api_key.trim());
    }

    const updatedUrl = (base_url || api_url)?.trim() || current.base_url;
    let resolvedActive = current.is_active;
    let resolvedStatus = current.status || 'active';

    if (is_active !== undefined) {
      resolvedActive = Boolean(is_active);
      resolvedStatus = resolvedActive ? 'active' : 'inactive';
    } else if (status !== undefined) {
      resolvedStatus = status;
      resolvedActive = status !== 'inactive';
    }

    const mergedMetadata = metadata !== undefined || config !== undefined ? { ...(current.config || {}), ...(current.metadata || {}), ...config, ...metadata } : current.metadata;

    // Decrypt key to test health status on update
    let decryptedKeyForTest = '';
    try {
      decryptedKeyForTest = decrypt(encryptedKey);
    } catch (_) {
      decryptedKeyForTest = encryptedKey;
    }

    const targetType = provider_type || current.provider_type;
    const targetEndpoint = endpoint_id !== undefined ? (endpoint_id?.trim() || null) : current.endpoint_id;

    // Pre-flight health test on save
    const pingTest = await testGpuProviderHealth(
      targetType,
      updatedUrl,
      targetEndpoint,
      decryptedKeyForTest,
      Number(id)
    );

    const updateRes = await pool.query(
      `UPDATE gpu_providers
       SET 
         name = COALESCE($1, name),
         provider_type = COALESCE($2, provider_type),
         endpoint_id = $3,
         base_url = COALESCE($4, base_url),
         api_url = COALESCE($5, api_url),
         encrypted_api_key = $6,
         current_load_capacity = COALESCE($7, current_load_capacity),
         status = COALESCE($8, status),
         metadata = COALESCE($9, metadata),
         capabilities = COALESCE($10, capabilities),
         daily_budget = COALESCE($11, daily_budget),
         config = COALESCE($12, config),
         is_active = $13,
         health_status = $14,
         latency_ms = $15,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $16
       RETURNING id, provider_id, name, provider_type, endpoint_id, base_url, api_url, current_load_capacity, status, metadata, health_status, latency_ms, capabilities, daily_budget, config, is_active, updated_at`,
      [
        name?.trim(),
        provider_type,
        targetEndpoint,
        updatedUrl,
        updatedUrl,
        encryptedKey,
        current_load_capacity !== undefined ? Number(current_load_capacity) : current.current_load_capacity,
        resolvedStatus,
        mergedMetadata,
        capabilities,
        daily_budget,
        mergedMetadata,
        resolvedActive,
        pingTest.status,
        pingTest.latencyMs,
        id
      ]
    );

    invalidateGpuCache();

    res.json({
      success: true,
      provider: updateRes.rows[0]
    });
  } catch (error: any) {
    console.error('[GPU Providers] Update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Delete GPU Provider
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const delRes = await pool.query('DELETE FROM gpu_providers WHERE id = $1 RETURNING provider_id', [id]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'GPU Provider not found' });
    }

    invalidateGpuCache();
    res.json({ success: true, message: `GPU Provider deleted successfully` });
  } catch (error: any) {
    console.error('[GPU Providers] Delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Test Ping / Health of a GPU Provider
router.post('/:id/test', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const providerRes = await pool.query('SELECT * FROM gpu_providers WHERE id = $1', [id]);
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'GPU Provider not found' });
    }

    const provider = providerRes.rows[0];
    let decryptedKey = '';
    try {
      decryptedKey = decrypt(provider.encrypted_api_key);
    } catch (_) {
      decryptedKey = provider.encrypted_api_key;
    }

    const testResult = await testGpuProviderHealth(
      provider.provider_type,
      provider.base_url,
      provider.endpoint_id,
      decryptedKey,
      Number(id)
    );

    // Update status in DB
    await pool.query(
      `UPDATE gpu_providers SET health_status = $1, latency_ms = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [testResult.status, testResult.latencyMs, id]
    );

    invalidateGpuCache();

    res.json({
      success: testResult.success,
      status: testResult.status,
      latencyMs: testResult.latencyMs,
      message: testResult.message
    });
  } catch (error: any) {
    console.error('[GPU Test] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Discover / Sync Models from Provider Endpoint
router.post('/:id/sync-models', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const providerRes = await pool.query('SELECT * FROM gpu_providers WHERE id = $1', [id]);
    if (providerRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'GPU Provider not found' });
    }

    const provider = providerRes.rows[0];
    let decryptedKey = '';
    try {
      decryptedKey = decrypt(provider.encrypted_api_key);
    } catch (_) {
      decryptedKey = provider.encrypted_api_key;
    }

    const syncResult = await syncRemoteGpuModels(
      provider.provider_id,
      provider.provider_type,
      provider.base_url,
      provider.endpoint_id,
      decryptedKey
    );

    // Clean up any existing duplicates first for this specific provider
    await pool.query(`
      DELETE FROM gpu_provider_models a
      USING gpu_provider_models b
      WHERE a.id > b.id
        AND a.provider_id = b.provider_id
        AND a.model_id = b.model_id
        AND a.provider_id = $1
    `, [id]);

    if (syncResult.success) {
      if (syncResult.models.length > 0) {
        const freshModelIds = syncResult.models.map((m: any) => m.model_id);
        // Remove models not returned by the remote server
        await pool.query(
          'DELETE FROM gpu_provider_models WHERE provider_id = $1 AND NOT (model_id = ANY($2))',
          [id, freshModelIds]
        );

        // Get existing model_ids for this provider to prevent duplicate inserts
        const existingRes = await pool.query(
          'SELECT model_id FROM gpu_provider_models WHERE provider_id = $1',
          [id]
        );
        const existingIds = new Set(existingRes.rows.map((r: any) => r.model_id));

        for (const m of syncResult.models) {
          if (!existingIds.has(m.model_id)) {
            await pool.query(
              `INSERT INTO gpu_provider_models (provider_id, model_id, name, task_type, context_window, max_output_tokens, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, true)`,
              [id, m.model_id, m.name, m.task_type, m.context_window, m.max_output_tokens]
            );
            existingIds.add(m.model_id);
          } else {
            await pool.query(
              `UPDATE gpu_provider_models
               SET name = $1, task_type = $2, context_window = $3, max_output_tokens = $4, is_active = true
               WHERE provider_id = $5 AND model_id = $6`,
              [m.name, m.task_type, m.context_window, m.max_output_tokens, id, m.model_id]
            );
          }
        }
      }

      // Mark provider as online on successful sync
      await pool.query(
        `UPDATE gpu_providers SET health_status = 'online', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );
      invalidateGpuCache();
    }

    // Return updated models list
    const modelsRes = await pool.query(
      'SELECT * FROM gpu_provider_models WHERE provider_id = $1 ORDER BY name ASC',
      [id]
    );

    res.json({
      success: syncResult.success,
      count: syncResult.count,
      message: syncResult.message,
      models: modelsRes.rows
    });
  } catch (error: any) {
    console.error('[GPU Sync] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7.1 Sync Models On-Demand across active GPU Providers (Manual trigger only)
router.post('/sync-models-on-demand', authenticateAdmin, async (req, res) => {
  try {
    const providersRes = await pool.query('SELECT * FROM gpu_providers WHERE is_active = true');
    let totalSynced = 0;
    const results: any[] = [];

    for (const provider of providersRes.rows) {
      let decryptedKey = '';
      try {
        decryptedKey = decrypt(provider.encrypted_api_key);
      } catch (_) {
        decryptedKey = provider.encrypted_api_key;
      }

      const syncResult = await syncRemoteGpuModels(
        provider.provider_id,
        provider.provider_type,
        provider.base_url,
        provider.endpoint_id,
        decryptedKey
      );

      if (syncResult.success && syncResult.models.length > 0) {
        const freshModelIds = syncResult.models.map((m: any) => m.model_id);
        await pool.query(
          'DELETE FROM gpu_provider_models WHERE provider_id = $1 AND NOT (model_id = ANY($2))',
          [provider.id, freshModelIds]
        );

        const existingRes = await pool.query(
          'SELECT model_id FROM gpu_provider_models WHERE provider_id = $1',
          [provider.id]
        );
        const existingIds = new Set(existingRes.rows.map((r: any) => r.model_id));

        for (const m of syncResult.models) {
          if (!existingIds.has(m.model_id)) {
            await pool.query(
              `INSERT INTO gpu_provider_models (provider_id, model_id, name, task_type, context_window, max_output_tokens, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, true)`,
              [provider.id, m.model_id, m.name, m.task_type, m.context_window, m.max_output_tokens]
            );
            existingIds.add(m.model_id);
          } else {
            await pool.query(
              `UPDATE gpu_provider_models
               SET name = $1, task_type = $2, context_window = $3, max_output_tokens = $4, is_active = true
               WHERE provider_id = $5 AND model_id = $6`,
              [m.name, m.task_type, m.context_window, m.max_output_tokens, provider.id, m.model_id]
            );
          }
        }
        totalSynced += syncResult.count;
        await pool.query(
          `UPDATE gpu_providers SET health_status = 'online', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [provider.id]
        );
      }
      results.push({ provider_id: provider.provider_id, name: provider.name, count: syncResult.count, message: syncResult.message });
    }

    invalidateGpuCache();

    const allModelsRes = await pool.query(`
      SELECT gpm.*, gp.provider_id, gp.name as provider_name
      FROM gpu_provider_models gpm
      JOIN gpu_providers gp ON gp.id = gpm.provider_id
      WHERE gp.is_active = true AND gpm.is_active = true
      ORDER BY gp.name ASC, gpm.name ASC
    `);

    res.json({
      success: true,
      totalCount: totalSynced,
      message: `Successfully synchronized ${totalSynced} models on demand.`,
      models: allModelsRes.rows,
      details: results
    });
  } catch (error: any) {
    console.error('[GPU Sync-On-Demand] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7.2 Refresh & Verify GPU Providers Status
router.post('/reprovision', authenticateAdmin, async (req, res) => {
  try {
    invalidateGpuCache();
    const check = await pool.query('SELECT id, provider_id, name, health_status, latency_ms FROM gpu_providers WHERE is_active = true');
    res.json({ success: true, count: check.rowCount || 0, providers: check.rows, message: 'GPU cache refreshed successfully.' });
  } catch (error: any) {
    console.error('[GPU Refresh] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7.3 Automated Discovery Scan across registered GPU endpoints
router.post('/discover', authenticateAdmin, async (req, res) => {
  try {
    const { runGpuEndpointDiscovery } = await import('../services/gpu/gpuDiscoveryService.js');
    const result = await runGpuEndpointDiscovery();
    res.json(result);
  } catch (error: any) {
    console.error('[GPU Discovery Route] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7.4 Discovery Service Status & Telemetry
router.get('/discovery-status', authenticateAdmin, async (req, res) => {
  try {
    const { getGpuDiscoveryStatus } = await import('../services/gpu/gpuDiscoveryService.js');
    res.json({ success: true, ...getGpuDiscoveryStatus() });
  } catch (error: any) {
    console.error('[GPU Discovery Status] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Get Models for specific provider
router.get('/:id/models', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Clean up any existing duplicates on load to ensure absolute clean state for this provider
    await pool.query(`
      DELETE FROM gpu_provider_models a
      USING gpu_provider_models b
      WHERE a.id > b.id
        AND a.provider_id = b.provider_id
        AND a.model_id = b.model_id
        AND a.provider_id = $1
    `, [id]);

    const modelsRes = await pool.query(
      'SELECT * FROM gpu_provider_models WHERE provider_id = $1 ORDER BY name ASC',
      [id]
    );
    res.json({ success: true, models: modelsRes.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Add a custom model to provider manually
router.post('/:id/models', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { model_id, name, task_type = 'vision_analysis', context_window = 32768, max_output_tokens = 4096 } = req.body;

    if (!model_id) {
      return res.status(400).json({ success: false, error: 'model_id is required' });
    }

    const trimmedModelId = model_id.trim();

    // Check if the model_id already exists for this provider
    const existing = await pool.query(
      'SELECT * FROM gpu_provider_models WHERE provider_id = $1 AND model_id = $2',
      [id, trimmedModelId]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({ success: true, model: existing.rows[0], message: 'Model already exists' });
    }

    const insertRes = await pool.query(
      `INSERT INTO gpu_provider_models (provider_id, model_id, name, task_type, context_window, max_output_tokens, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [id, trimmedModelId, (name || model_id).trim(), task_type, context_window, max_output_tokens]
    );

    res.status(201).json({ success: true, model: insertRes.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Delete a model
router.delete('/models/:modelId', authenticateAdmin, async (req, res) => {
  try {
    const { modelId } = req.params;
    await pool.query('DELETE FROM gpu_provider_models WHERE id = $1', [modelId]);
    res.json({ success: true, message: 'Model deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. Test Live Vision Execution with prompt & image (Live Sandbox)
router.post('/inference/test-vision', authenticateAdmin, async (req, res) => {
  try {
    const { prompt, imageUrls, toolId = 'vision' } = req.body;

    if (!prompt || !imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'prompt and at least one imageUrl are required'
      });
    }

    const result = await executeGpuVisionInference(toolId, {
      prompt,
      imageUrls,
      maxTokens: 1024
    });

    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error('[Live Vision Test] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. Universal GPU Task Dispatch Sandbox (Vision, Image, Video)
router.post('/inference/dispatch', authenticateAdmin, async (req, res) => {
  try {
    const { taskType, prompt, preferredProviderId, preferredModelId, imageUrls, imageSettings, videoSettings } = req.body;

    if (!taskType || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'taskType and prompt are required'
      });
    }

    const { dispatchGpuTask } = await import('../services/gpu/gpuTaskDispatcher.js');
    const result = await dispatchGpuTask({
      taskType,
      prompt,
      preferredProviderId,
      preferredModelId,
      imageUrls,
      imageSettings,
      videoSettings,
      userId: (req as any).user?.id || 1
    });

    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error('[GPU Universal Dispatch Sandbox] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 13. Get GPU Execution Jobs (Tasks Queue History & Monitoring)
router.get('/jobs', authenticateAdmin, async (req, res) => {
  try {
    const { task_type, status, limit = 50, offset = 0 } = req.query;
    let query = `
      SELECT 
        j.*,
        gp.name as provider_name,
        gp.provider_id as provider_code,
        u.email as user_email
      FROM gpu_execution_jobs j
      LEFT JOIN gpu_providers gp ON gp.id = j.provider_id
      LEFT JOIN users u ON u.id = j.user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (task_type && typeof task_type === 'string') {
      params.push(task_type);
      query += ` AND j.task_type = $${params.length}`;
    }

    if (status && typeof status === 'string') {
      params.push(status);
      query += ` AND j.status = $${params.length}`;
    }

    query += ` ORDER BY j.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(String(limit), 10) || 50, parseInt(String(offset), 10) || 0);

    const result = await pool.query(query, params);
    const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM gpu_execution_jobs`);

    res.json({
      success: true,
      jobs: result.rows,
      total: countRes.rows[0]?.total || 0
    });
  } catch (error: any) {
    console.error('[GPU Jobs Fetch] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 14. Get Specific Execution Job Details
router.get('/jobs/:jobId', authenticateAdmin, async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await pool.query(
      `SELECT 
         j.*,
         gp.name as provider_name,
         gp.provider_id as provider_code
       FROM gpu_execution_jobs j
       LEFT JOIN gpu_providers gp ON gp.id = j.provider_id
       WHERE j.job_id = $1 OR j.id::text = $1 LIMIT 1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
      success: true,
      job: result.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 15. Purge/Clean Execution Jobs (Delete all, selected, by status, or older than days)
router.post('/jobs/purge', authenticateAdmin, async (req, res) => {
  try {
    const { mode, job_ids, status, days } = req.body;
    let query = '';
    let params: any[] = [];

    if (mode === 'all') {
      query = 'DELETE FROM gpu_execution_jobs';
    } else if (mode === 'selected') {
      if (!Array.isArray(job_ids) || job_ids.length === 0) {
        return res.status(400).json({ success: false, error: 'No job IDs provided for selected deletion' });
      }
      const numericIds = job_ids.map((id: any) => Number(id)).filter((n: number) => !isNaN(n));
      const stringIds = job_ids.map((id: any) => String(id));
      
      query = 'DELETE FROM gpu_execution_jobs WHERE id = ANY($1::int[]) OR job_id = ANY($2::text[])';
      params = [numericIds, stringIds];
    } else if (mode === 'status') {
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ success: false, error: 'Valid status must be specified' });
      }
      query = 'DELETE FROM gpu_execution_jobs WHERE status = $1';
      params = [status];
    } else if (mode === 'older_than') {
      const parsedDays = parseInt(String(days), 10);
      if (isNaN(parsedDays) || parsedDays < 0) {
        return res.status(400).json({ success: false, error: 'Valid number of days must be specified' });
      }
      query = `DELETE FROM gpu_execution_jobs WHERE created_at < NOW() - ($1 || ' days')::interval`;
      params = [parsedDays];
    } else {
      return res.status(400).json({ success: false, error: 'Invalid purge mode specified' });
    }

    const result = await pool.query(query, params);
    const countRes = await pool.query('SELECT COUNT(*)::int as total FROM gpu_execution_jobs');

    res.json({
      success: true,
      deletedCount: result.rowCount || 0,
      remainingTotal: countRes.rows[0]?.total || 0,
      message: `Successfully purged ${result.rowCount || 0} job records`
    });
  } catch (error: any) {
    console.error('[GPU Jobs Purge] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 16. Delete Specific Execution Job
router.delete('/jobs/:jobId', authenticateAdmin, async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await pool.query(
      'DELETE FROM gpu_execution_jobs WHERE job_id = $1 OR id::text = $1',
      [jobId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const countRes = await pool.query('SELECT COUNT(*)::int as total FROM gpu_execution_jobs');

    res.json({
      success: true,
      message: 'Job deleted successfully',
      remainingTotal: countRes.rows[0]?.total || 0
    });
  } catch (error: any) {
    console.error('[GPU Job Delete] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
