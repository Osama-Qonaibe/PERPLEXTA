import { getDatabasePool } from '../../db/index.js';
import { decrypt } from '../../utils/crypto.js';
import { testGpuProviderHealth, syncRemoteGpuModels, invalidateGpuCache } from '../gpuVaultService.js';
import { invalidateOrchestratorConfigCache } from '../../db/queries.js';
import { memoryCache } from '../../utils/cache.js';

export interface DiscoveredModelInfo {
  model_id: string;
  name: string;
  task_type: string;
  context_window?: number;
  max_output_tokens?: number;
}

export interface DiscoveredProviderReport {
  id: number;
  provider_id: string;
  name: string;
  provider_type: string;
  status: 'online' | 'cold_boot' | 'offline';
  latency_ms: number;
  modelsCount: number;
  models: DiscoveredModelInfo[];
  message: string;
}

export interface GpuDiscoveryResult {
  success: boolean;
  timestamp: string;
  scannedProvidersCount: number;
  activeProvidersCount: number;
  discoveredModelsCount: number;
  providers: DiscoveredProviderReport[];
  orchestratorSynchronized: boolean;
  message: string;
}

export interface GpuDiscoveryStatus {
  isRunning: boolean;
  lastRun: string | null;
  lastResult: GpuDiscoveryResult | null;
  intervalMinutes: number;
  discoveredModelsCount: number;
  activeProvidersCount: number;
}

let isDiscoveryRunning = false;
let lastDiscoveryRun: string | null = null;
let lastDiscoveryResult: GpuDiscoveryResult | null = null;
let discoveryIntervalTimer: NodeJS.Timeout | null = null;
let discoveryIntervalMinutes = 5;

/**
 * Returns current status and telemetry of the automated GPU discovery service
 */
export function getGpuDiscoveryStatus(): GpuDiscoveryStatus {
  return {
    isRunning: isDiscoveryRunning,
    lastRun: lastDiscoveryRun,
    lastResult: lastDiscoveryResult,
    intervalMinutes: discoveryIntervalMinutes,
    discoveredModelsCount: lastDiscoveryResult?.discoveredModelsCount ?? 0,
    activeProvidersCount: lastDiscoveryResult?.activeProvidersCount ?? 0
  };
}

/**
 * Scans all registered active GPU provider endpoints, discovers available models
 * from their live endpoints, updates the database, and synchronizes them
 * with the Tool Orchestrator.
 */
export async function runGpuEndpointDiscovery(options?: { forceAll?: boolean }): Promise<GpuDiscoveryResult> {
  if (isDiscoveryRunning) {
    console.log('[GPU Discovery] Scan already in progress. Skipping overlapping execution.');
    if (lastDiscoveryResult) {
      return lastDiscoveryResult;
    }
    return {
      success: true,
      timestamp: new Date().toISOString(),
      scannedProvidersCount: 0,
      activeProvidersCount: 0,
      discoveredModelsCount: 0,
      providers: [],
      orchestratorSynchronized: true,
      message: 'Discovery scan already in progress'
    };
  }

  isDiscoveryRunning = true;
  const startTime = Date.now();
  const pool = getDatabasePool('core');

  if (!pool) {
    isDiscoveryRunning = false;
    throw new Error('[GPU Discovery] Core database pool is not available.');
  }

  try {
    console.log('[GPU Discovery] 🛰️ Commencing automated endpoint scan and orchestrator synchronization...');

    // 1. Fetch all registered GPU providers
    const query = options?.forceAll
      ? 'SELECT * FROM gpu_providers ORDER BY id ASC'
      : 'SELECT * FROM gpu_providers WHERE is_active = true ORDER BY id ASC';

    const providersRes = await pool.query(query);
    const providers = providersRes.rows;

    let totalDiscoveredModels = 0;
    let onlineProvidersCount = 0;
    const providerReports: DiscoveredProviderReport[] = [];

    for (const provider of providers) {
      let decryptedKey = '';
      try {
        decryptedKey = decrypt(provider.encrypted_api_key);
      } catch {
        decryptedKey = provider.encrypted_api_key || '';
      }

      // Step A: Health and latency ping test
      const healthTest = await testGpuProviderHealth(
        provider.provider_type,
        provider.base_url,
        provider.endpoint_id,
        decryptedKey,
        provider.id
      );

      // Step B: Remote Model Discovery
      const syncResult = await syncRemoteGpuModels(
        provider.provider_id,
        provider.provider_type,
        provider.base_url,
        provider.endpoint_id,
        decryptedKey
      );

      let providerModels: DiscoveredModelInfo[] = [];

      if (syncResult.success && syncResult.models.length > 0) {
        onlineProvidersCount++;
        const freshModelIds = syncResult.models.map((m: any) => m.model_id);

        // Delete stale/obsolete models not returned by the active remote endpoint
        await pool.query(
          'DELETE FROM gpu_provider_models WHERE provider_id = $1 AND NOT (model_id = ANY($2))',
          [provider.id, freshModelIds]
        );

        // Retrieve existing model_ids to prevent duplicates
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

          providerModels.push({
            model_id: m.model_id,
            name: m.name,
            task_type: m.task_type,
            context_window: m.context_window,
            max_output_tokens: m.max_output_tokens
          });
        }

        totalDiscoveredModels += syncResult.count;

        // Update provider status to online with live measured latency
        await pool.query(
          `UPDATE gpu_providers 
           SET health_status = 'online', latency_ms = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [healthTest.latencyMs || 0, provider.id]
        );

        providerReports.push({
          id: provider.id,
          provider_id: provider.provider_id,
          name: provider.name,
          provider_type: provider.provider_type,
          status: 'online',
          latency_ms: healthTest.latencyMs || 0,
          modelsCount: syncResult.count,
          models: providerModels,
          message: syncResult.message
        });
      } else {
        // If sync returned no models or failed, mark status according to health check
        const resolvedStatus = healthTest.status || 'offline';
        await pool.query(
          `UPDATE gpu_providers 
           SET health_status = $1, latency_ms = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [resolvedStatus, healthTest.latencyMs || 0, provider.id]
        );

        // Fetch any existing models that might still be stored
        const existingStored = await pool.query(
          'SELECT model_id, name, task_type, context_window, max_output_tokens FROM gpu_provider_models WHERE provider_id = $1 AND is_active = true',
          [provider.id]
        );

        providerReports.push({
          id: provider.id,
          provider_id: provider.provider_id,
          name: provider.name,
          provider_type: provider.provider_type,
          status: resolvedStatus,
          latency_ms: healthTest.latencyMs || 0,
          modelsCount: existingStored.rows.length,
          models: existingStored.rows,
          message: syncResult.message || healthTest.message
        });
      }
    }

    // 2. Invalidate relevant caches across the system
    invalidateGpuCache();
    memoryCache.delete('admin:orchestrator:models');
    memoryCache.delete('admin:orchestrator:routes');
    invalidateOrchestratorConfigCache();

    // 3. Reconcile with Tool Orchestrator routes
    // Check if any tool configured with a GPU provider is pointing to an offline provider or missing model
    const gpuToolsRes = await pool.query(
      `SELECT tool_id, primary_provider, primary_model, fallback_1_provider, fallback_1_model 
       FROM tool_orchestrator 
       WHERE tool_id IN ('image', 'video', 'vision', 'perplexta_vision')`
    );

    const activeProviderSlugs = new Set(
      providerReports.filter((p) => p.status === 'online').map((p) => p.provider_id.toLowerCase())
    );
    const activeModelIds = new Set(
      providerReports
        .filter((p) => p.status === 'online')
        .flatMap((p) => p.models.map((m) => m.model_id.toLowerCase()))
    );

    for (const tool of gpuToolsRes.rows) {
      if (tool.primary_provider && !activeProviderSlugs.has(tool.primary_provider.toLowerCase())) {
        console.warn(
          `[GPU Discovery Reconcile] Tool '${tool.tool_id}' references provider '${tool.primary_provider}' which is currently offline or unconfirmed.`
        );
      }
      if (tool.primary_model && !activeModelIds.has(tool.primary_model.toLowerCase())) {
        console.warn(
          `[GPU Discovery Reconcile] Tool '${tool.tool_id}' references model '${tool.primary_model}' which was not reported by active endpoints.`
        );
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const result: GpuDiscoveryResult = {
      success: true,
      timestamp: new Date().toISOString(),
      scannedProvidersCount: providers.length,
      activeProvidersCount: onlineProvidersCount,
      discoveredModelsCount: totalDiscoveredModels,
      providers: providerReports,
      orchestratorSynchronized: true,
      message: `Automated GPU discovery completed in ${duration}s. Scanned ${providers.length} provider(s), discovered ${totalDiscoveredModels} active model(s).`
    };

    lastDiscoveryRun = result.timestamp;
    lastDiscoveryResult = result;

    console.log(`[GPU Discovery] ✅ ${result.message}`);
    return result;
  } catch (err: any) {
    console.error('[GPU Discovery] ❌ Discovery scan failed:', err);
    const failResult: GpuDiscoveryResult = {
      success: false,
      timestamp: new Date().toISOString(),
      scannedProvidersCount: 0,
      activeProvidersCount: 0,
      discoveredModelsCount: 0,
      providers: [],
      orchestratorSynchronized: false,
      message: err?.message || 'Discovery scan failed'
    };
    lastDiscoveryResult = failResult;
    return failResult;
  } finally {
    isDiscoveryRunning = false;
  }
}

/**
 * Starts the automated periodic GPU discovery service
 */
export function startAutomatedGpuDiscovery(intervalMinutes: number = 5) {
  if (discoveryIntervalTimer) {
    clearInterval(discoveryIntervalTimer);
    discoveryIntervalTimer = null;
  }

  discoveryIntervalMinutes = intervalMinutes;

  console.log(`[GPU Discovery Service] Initialized with periodic interval of ${intervalMinutes} minutes.`);

  // Initial delayed discovery pass (5 seconds after boot to let DB pools stabilize)
  setTimeout(() => {
    runGpuEndpointDiscovery().catch((err) => {
      console.warn('[GPU Discovery Service] Initial scan warning:', err.message);
    });
  }, 5000);

  // Periodic schedule
  discoveryIntervalTimer = setInterval(() => {
    runGpuEndpointDiscovery().catch((err) => {
      console.warn('[GPU Discovery Service] Periodic scan warning:', err.message);
    });
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stops the automated discovery service
 */
export function stopAutomatedGpuDiscovery() {
  if (discoveryIntervalTimer) {
    clearInterval(discoveryIntervalTimer);
    discoveryIntervalTimer = null;
    console.log('[GPU Discovery Service] Stopped.');
  }
}
