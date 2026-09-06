import { getCachedGpuProviders } from '../gpuVaultService.js';
import { getDatabasePool } from '../../db/index.js';

export interface VisionInferenceRequest {
  prompt: string;
  imageUrls: string[]; // Base64 or HTTP URLs
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface VisionInferenceResult {
  text: string;
  providerId: string;
  modelId: string;
  latencyMs: number;
  tokensUsed?: number;
}

/**
 * Execute vision analysis through the configured GPU Provider infrastructure
 * with automatic fallback logic.
 */
export async function executeGpuVisionInference(
  toolId: string = 'vision',
  request: VisionInferenceRequest
): Promise<VisionInferenceResult> {
  const pool = getDatabasePool('core');
  if (!pool) {
    throw new Error('Database pool unavailable');
  }

  // 1. Fetch orchestrator configuration for this tool
  const orchRes = await pool.query(
    `SELECT * FROM tool_orchestrator WHERE tool_id = $1`,
    [toolId]
  );

  const orch = orchRes.rows[0];
  if (!orch) {
    throw new Error(`No orchestrator configuration found for tool: ${toolId}`);
  }

  // 2. Build prioritized list of targets [primary, fallback_1, fallback_2, fallback_3]
  const targets: Array<{ provider: string; model: string }> = [];
  if (orch.primary_provider && orch.primary_model) {
    targets.push({ provider: orch.primary_provider, model: orch.primary_model });
  }
  if (orch.fallback_1_provider && orch.fallback_1_model) {
    targets.push({ provider: orch.fallback_1_provider, model: orch.fallback_1_model });
  }
  if (orch.fallback_2_provider && orch.fallback_2_model) {
    targets.push({ provider: orch.fallback_2_provider, model: orch.fallback_2_model });
  }
  if (orch.fallback_3_provider && orch.fallback_3_model) {
    targets.push({ provider: orch.fallback_3_provider, model: orch.fallback_3_model });
  }

  if (targets.length === 0) {
    throw new Error(`Tool ${toolId} has no assigned GPU provider or model in Orchestrator.`);
  }

  // 3. Load active GPU providers from zero-latency memory cache
  const gpuProviders = await getCachedGpuProviders();

  let lastError: Error | null = null;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const provider = gpuProviders.get(target.provider);

    if (!provider || !provider.is_active) {
      console.warn(`[GpuInference] Target provider ${target.provider} is not active or not found in GPU vault. Skipping to next fallback.`);
      continue;
    }

    try {
      const startTime = Date.now();
      const resultText = await callProviderVision(provider, target.model, request);
      const latencyMs = Date.now() - startTime;

      // Update provider's real-time latency
      pool.query(
        `UPDATE gpu_providers SET latency_ms = $1, health_status = 'online', updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [latencyMs, provider.id]
      ).catch(() => {});

      return {
        text: resultText,
        providerId: provider.provider_id,
        modelId: target.model,
        latencyMs
      };
    } catch (err: any) {
      console.error(`[GpuInference] Failover triggered: Target [${target.provider}/${target.model}] failed: ${err.message}`);
      lastError = err;
      // Mark provider as offline or cold_boot if error indicates so
      const isCold = err.message?.includes('503') || err.message?.includes('cold');
      pool.query(
        `UPDATE gpu_providers SET health_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [isCold ? 'cold_boot' : 'offline', provider.id]
      ).catch(() => {});
      // Continue loop to try next fallback!
    }
  }

  throw lastError || new Error(`All configured GPU providers failed for tool ${toolId}`);
}

/**
 * Low-level dispatch to individual GPU provider worker/endpoint
 */
async function callProviderVision(
  provider: any,
  modelId: string,
  request: VisionInferenceRequest
): Promise<string> {
  let targetUrl = provider.base_url.trim().replace(/\/+$/, '');
  const apiKey = provider.decryptedKey;

  if (provider.provider_type === 'runpod_serverless') {
    if (provider.endpoint_id) {
      // RunPod OpenAI-compatible proxy route
      targetUrl = `https://api.runpod.ai/v2/${provider.endpoint_id.trim()}/openai/v1/chat/completions`;
    } else {
      targetUrl = `${targetUrl}/chat/completions`;
    }
  } else {
    targetUrl = targetUrl.endsWith('/v1') 
      ? `${targetUrl}/chat/completions` 
      : `${targetUrl}/v1/chat/completions`;
  }

  // Build OpenAI Vision standard multimodal payload
  const contentParts: any[] = [];
  
  // Add images
  for (const url of request.imageUrls) {
    contentParts.push({
      type: 'image_url',
      image_url: {
        url: url.startsWith('data:') || url.startsWith('http') ? url : `data:image/jpeg;base64,${url}`
      }
    });
  }

  // Add text prompt
  contentParts.push({
    type: 'text',
    text: request.prompt
  });

  const messages: any[] = [];
  if (request.systemPrompt) {
    messages.push({
      role: 'system',
      content: request.systemPrompt
    });
  }
  messages.push({
    role: 'user',
    content: contentParts
  });

  const body = {
    model: modelId,
    messages,
    max_tokens: request.maxTokens || 4096,
    temperature: request.temperature ?? 0.2
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const controller = new AbortController();
  const timeoutMs = (provider.config?.timeout_seconds || 60) * 1000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GPU API returned HTTP ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data: any = await res.json();
    const choice = data?.choices?.[0];
    const output = choice?.message?.content || choice?.text || '';

    if (!output) {
      throw new Error('Received empty response from GPU vision worker');
    }

    return typeof output === 'string' ? output : JSON.stringify(output);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`GPU execution timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  }
}
