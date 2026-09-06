import { getDatabasePool } from '../../db/index.js';
import { getCachedGpuProviders, invalidateGpuCache } from '../gpuVaultService.js';
import type { GpuProvider, GpuProviderModel, GpuExecutionJob } from '../../db/types.js';

export interface RankedGpuTarget {
  provider: GpuProvider & { decryptedKey: string };
  model: GpuProviderModel;
  score: number;
  reason: string;
}

/**
 * Intelligent Health-Aware Load Balancer for GPU Nodes.
 * Selects and ranks the best operational GPU nodes for a given task type
 * (vision_analysis, image_gen, video_gen) using real-time telemetry,
 * health checks, latency, daily budgets, and load capacity.
 */
export async function selectOptimalGpuNodes(
  taskType: 'vision_analysis' | 'image_gen' | 'video_gen',
  preferredProviderId?: string
): Promise<RankedGpuTarget[]> {
  const pool = getDatabasePool('core');
  if (!pool) return [];

  const providersMap = await getCachedGpuProviders();
  if (providersMap.size === 0) return [];

  // Strictly query models registered and synced for this task type
  // No synthetic or phantom models are generated to avoid excessive/fake calls
  const modelsRes = await pool.query(
    `SELECT m.*, p.provider_id as p_id 
     FROM gpu_provider_models m
     JOIN gpu_providers p ON m.provider_id = p.id
     WHERE m.task_type = $1 AND m.is_active = true AND p.is_active = true`,
    [taskType]
  );

  const models = modelsRes.rows as (GpuProviderModel & { p_id: string })[];

  const targets: RankedGpuTarget[] = [];

  for (const model of models) {
    const provider = providersMap.get(model.p_id);
    if (!provider || !provider.is_active || provider.status === 'inactive') {
      continue;
    }

    // Check budget limit
    const dailyBudget = parseFloat(String(provider.daily_budget || '0'));
    const usedToday = parseFloat(String(provider.used_today || '0'));
    if (dailyBudget > 0 && usedToday >= dailyBudget) {
      continue;
    }

    // Scoring heuristic:
    // Base health score: online = 100, cold_boot = 35, busy = 15, offline = 0
    let healthScore = 0;
    if (provider.health_status === 'online') healthScore = 100;
    else if (provider.health_status === 'cold_boot') healthScore = 35;
    else if (provider.health_status === 'busy') healthScore = 15;
    else healthScore = 0;

    // Latency factor: Lower latency = higher score (up to 50 points)
    const latency = provider.latency_ms || 300;
    const latencyScore = Math.max(0, Math.min(50, Math.floor(50 - (latency / 50))));

    // Load capacity factor: default 100 -> up to 20 points
    const capacityScore = Math.min(20, Math.floor((provider.current_load_capacity || 100) / 5));

    // Preference boost if explicitly preferred by admin orchestrator
    let preferenceBoost = 0;
    if (preferredProviderId && provider.provider_id.toLowerCase() === preferredProviderId.toLowerCase()) {
      preferenceBoost = 40;
    }

    const totalScore = healthScore + latencyScore + capacityScore + preferenceBoost;

    targets.push({
      provider,
      model,
      score: totalScore,
      reason: `Health: ${provider.health_status} (${healthScore}), Latency: ${latency}ms (${latencyScore}), Load: ${provider.current_load_capacity || 100}%`
    });
  }

  // Sort descending by highest operational score
  return targets.sort((a, b) => b.score - a.score);
}

/**
 * Creates an immutable tracking job in the database
 */
export async function createGpuExecutionJob(params: {
  jobId: string;
  userId?: number | null;
  providerId?: number | null;
  modelId: string;
  taskType: 'vision_analysis' | 'image_gen' | 'video_gen';
  prompt?: string;
  parameters?: any;
}): Promise<GpuExecutionJob> {
  const pool = getDatabasePool('core');
  if (!pool) {
    throw new Error('Core database pool unavailable');
  }

  const query = `
    INSERT INTO gpu_execution_jobs (
      job_id, user_id, provider_id, model_id, task_type, 
      status, prompt, parameters, created_at
    ) VALUES ($1, $2, $3, $4, $5, 'processing', $6, $7, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const parsedUserId = typeof params.userId === 'number' && Number.isFinite(params.userId) 
    ? params.userId 
    : (typeof params.userId === 'string' && /^\d+$/.test(params.userId) ? parseInt(params.userId, 10) : null);

  const values = [
    params.jobId,
    parsedUserId,
    params.providerId || null,
    params.modelId,
    params.taskType,
    params.prompt || null,
    JSON.stringify(params.parameters || {})
  ];

  const res = await pool.query(query, values);
  return res.rows[0] as GpuExecutionJob;
}

/**
 * Updates an execution job with completion, error, or remote task state
 */
export async function updateGpuExecutionJob(
  jobId: string,
  updates: {
    status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    providerId?: number | null;
    modelId?: string;
    remoteJobId?: string | null;
    resultUrl?: string | null;
    resultData?: any;
    latencyMs?: number;
    errorMessage?: string | null;
    attempts?: number;
    failoverCount?: number;
    costCharged?: number;
    completedAt?: Date;
  }
): Promise<void> {
  const pool = getDatabasePool('core');
  if (!pool) return;

  const setClauses: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.status !== undefined) {
    setClauses.push(`status = $${idx++}`);
    values.push(updates.status);
    if (updates.status === 'completed' || updates.status === 'failed') {
      setClauses.push(`completed_at = CURRENT_TIMESTAMP`);
    }
  }

  if (updates.providerId !== undefined) {
    setClauses.push(`provider_id = $${idx++}`);
    values.push(updates.providerId);
  }

  if (updates.modelId !== undefined) {
    setClauses.push(`model_id = $${idx++}`);
    values.push(updates.modelId);
  }

  if (updates.remoteJobId !== undefined) {
    setClauses.push(`remote_job_id = $${idx++}`);
    values.push(updates.remoteJobId);
  }

  if (updates.resultUrl !== undefined) {
    setClauses.push(`result_url = $${idx++}`);
    values.push(updates.resultUrl);
  }

  if (updates.resultData !== undefined) {
    setClauses.push(`result_data = $${idx++}`);
    values.push(JSON.stringify(updates.resultData));
  }

  if (updates.latencyMs !== undefined) {
    setClauses.push(`latency_ms = $${idx++}`);
    values.push(updates.latencyMs);
  }

  if (updates.errorMessage !== undefined) {
    setClauses.push(`error_message = $${idx++}`);
    values.push(updates.errorMessage);
  }

  if (updates.attempts !== undefined) {
    setClauses.push(`attempts = $${idx++}`);
    values.push(updates.attempts);
  }

  if (updates.failoverCount !== undefined) {
    setClauses.push(`failover_count = $${idx++}`);
    values.push(updates.failoverCount);
  }

  if (updates.costCharged !== undefined) {
    setClauses.push(`cost_charged = $${idx++}`);
    values.push(updates.costCharged);
  }

  if (setClauses.length === 0) return;

  values.push(jobId);
  const sql = `UPDATE gpu_execution_jobs SET ${setClauses.join(', ')} WHERE job_id = $${idx}`;
  await pool.query(sql, values);
}

/**
 * Updates provider runtime health and usage metrics
 */
export async function recordProviderExecutionSuccess(
  providerId: number,
  latencyMs: number,
  costCharged: number = 0
): Promise<void> {
  const pool = getDatabasePool('core');
  if (!pool) return;

  try {
    await pool.query(
      `UPDATE gpu_providers 
       SET latency_ms = $1, 
           health_status = 'online', 
           used_today = COALESCE(used_today, 0) + $2,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [latencyMs, costCharged, providerId]
    );
  } catch (err: any) {
    console.warn(`[GpuLoadBalancer] Failed to record success for provider ${providerId}:`, err.message);
  }
}

/**
 * Updates provider runtime health when failure/error occurs
 */
export async function recordProviderExecutionFailure(
  providerId: number,
  errorMessage: string
): Promise<void> {
  const pool = getDatabasePool('core');
  if (!pool) return;

  const isCold = errorMessage.includes('503') || errorMessage.includes('cold') || errorMessage.includes('initializing');
  const newStatus = isCold ? 'cold_boot' : 'offline';

  try {
    await pool.query(
      `UPDATE gpu_providers 
       SET health_status = $1, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [newStatus, providerId]
    );
    invalidateGpuCache();
  } catch (err: any) {
    console.warn(`[GpuLoadBalancer] Failed to record failure for provider ${providerId}:`, err.message);
  }
}
