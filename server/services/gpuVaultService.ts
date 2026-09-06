import { getDatabasePool } from '../db/index.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import type { GpuProvider, GpuProviderModel } from '../db/types.js';

interface CachedGpuProvider extends GpuProvider {
  decryptedKey: string;
}

// In-memory cache for zero-latency retrieval during inference
let gpuCache: Map<string, CachedGpuProvider> | null = null;
let lastCacheRefresh = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute auto-refresh or manual invalidation

export function invalidateGpuCache() {
  gpuCache = null;
  lastCacheRefresh = 0;
}

/**
 * Returns all active GPU providers with in-memory caching
 */
export async function getCachedGpuProviders(): Promise<Map<string, CachedGpuProvider>> {
  const now = Date.now();
  if (gpuCache && (now - lastCacheRefresh < CACHE_TTL_MS)) {
    return gpuCache;
  }

  const pool = getDatabasePool('core');
  if (!pool) return new Map();

  try {
    const res = await pool.query(
      `SELECT * FROM gpu_providers WHERE is_active = true ORDER BY id ASC`
    );

    const newMap = new Map<string, CachedGpuProvider>();
    for (const row of res.rows) {
      let decrypted = '';
      try {
        decrypted = decrypt(row.encrypted_api_key);
      } catch (err) {
        decrypted = row.encrypted_api_key;
      }

      newMap.set(row.provider_id, {
        ...row,
        decryptedKey: decrypted
      });
    }

    gpuCache = newMap;
    lastCacheRefresh = now;
    return newMap;
  } catch (err) {
    console.error('[GpuVaultService] Failed to load GPU cache:', err);
    return gpuCache || new Map();
  }
}

/**
 * Test connectivity, ping latency and health status of a GPU provider
 */
export async function testGpuProviderHealth(
  providerType: string,
  baseUrl: string,
  endpointId: string | null,
  apiKey: string,
  providerDbId?: number
): Promise<{
  success: boolean;
  status: 'online' | 'cold_boot' | 'offline';
  latencyMs: number;
  message: string;
  detectedModels?: Array<{ id: string; name?: string }>;
}> {
  const startTime = Date.now();
  const cleanKey = apiKey.trim();

  // Normalize base URL
  let targetUrl = baseUrl.trim().replace(/\/+$/, '');

  // Extract clean endpoint ID for RunPod Serverless
  let cleanEndpoint = (endpointId || '').trim();
  if (!cleanEndpoint && baseUrl.includes('/v2/')) {
    cleanEndpoint = baseUrl;
  }
  if (cleanEndpoint.includes('/v2/')) {
    cleanEndpoint = cleanEndpoint.split('/v2/')[1];
  }
  cleanEndpoint = cleanEndpoint.split('?')[0].split('#')[0].split('/')[0].trim();

  // Formulate target URL based on provider type
  if (providerType === 'runpod_serverless') {
    if (!cleanEndpoint) {
      return {
        success: false,
        status: 'offline',
        latencyMs: 0,
        message: 'Missing Endpoint ID for RunPod Serverless (يرجى إضافة معرف الـ Endpoint من لوحة تحكم RunPod)'
      };
    }
    targetUrl = `https://api.runpod.ai/v2/${cleanEndpoint}`;

    // Pre-flight check: Verify if the RunPod API Key is valid and auto-resolve Endpoint ID using GraphQL
    if (cleanKey) {
      try {
        const gqlCheck = await fetch(`https://api.runpod.io/graphql?api_key=${cleanKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: 'query { myself { id email endpoints { id name } } }'
          }),
          signal: AbortSignal.timeout(6000)
        });
        
        if (gqlCheck.status === 401) {
          return {
            success: false,
            status: 'offline',
            latencyMs: Date.now() - startTime,
            message: 'Invalid RunPod API Key (مفتاح الـ API الخاص بـ RunPod غير صالح أو غير مفعل)'
          };
        }

        const gqlData = await gqlCheck.json();
        if (gqlData.data?.myself) {
          const userEndpoints = gqlData.data.myself.endpoints || [];
          if (userEndpoints.length > 0) {
            // Check if exact match exists
            const exactMatch = userEndpoints.find((e: any) => e.id === cleanEndpoint);
            if (!exactMatch) {
              // Try fuzzy match (e.g. replacing '1' with 'l', or '0' with 'o')
              const fuzzyMatch = userEndpoints.find((e: any) => 
                e.id.toLowerCase().replace(/1/g, 'l') === cleanEndpoint.toLowerCase().replace(/1/g, 'l')
              );
              if (fuzzyMatch) {
                console.log(`[GPU Vault] Auto-corrected RunPod endpoint ID from '${cleanEndpoint}' to '${fuzzyMatch.id}'`);
                cleanEndpoint = fuzzyMatch.id;
                targetUrl = `https://api.runpod.ai/v2/${cleanEndpoint}`;
                
                // Auto-update DB if provider ID is present
                if (providerDbId) {
                  try {
                    const pool = getDatabasePool('core');
                    await pool?.query('UPDATE gpu_providers SET endpoint_id = $1 WHERE id = $2', [cleanEndpoint, providerDbId]);
                  } catch (_) {}
                }
              } else if (userEndpoints.length === 1) {
                // If user has only 1 endpoint in RunPod, auto-use it!
                console.log(`[GPU Vault] Auto-selected single RunPod endpoint ID '${userEndpoints[0].id}'`);
                cleanEndpoint = userEndpoints[0].id;
                targetUrl = `https://api.runpod.ai/v2/${cleanEndpoint}`;
                if (providerDbId) {
                  try {
                    const pool = getDatabasePool('core');
                    await pool?.query('UPDATE gpu_providers SET endpoint_id = $1 WHERE id = $2', [cleanEndpoint, providerDbId]);
                  } catch (_) {}
                }
              }
            }
          }
        }
      } catch (gqlErr: any) {
        // Fallthrough if GraphQL endpoint is unreachable
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    let pingUrl = '';
    let headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (cleanKey) {
      headers['Authorization'] = `Bearer ${cleanKey}`;
    }

    if (providerType === 'runpod_serverless') {
      // Try health check endpoint first
      pingUrl = `${targetUrl}/health`;
    } else {
      // Default to /v1/models or /health
      pingUrl = targetUrl.endsWith('/v1') ? `${targetUrl}/models` : `${targetUrl}/v1/models`;
    }

    let response: Response;
    try {
      response = await fetch(pingUrl, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      // For RunPod serverless, do NOT trigger /runsync during health checks to avoid waking idle workers and wasting credits
    } catch (fetchErr: any) {
      // If /v1/models failed, try fallback /health
      if (providerType !== 'runpod_serverless' && targetUrl) {
        const fallbackUrl = `${targetUrl}/health`;
        response = await fetch(fallbackUrl, {
          method: 'GET',
          headers,
          signal: controller.signal
        });
      } else {
        throw fetchErr;
      }
    }

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      let data: any = null;
      try {
        data = await response.json();
      } catch (_) {}

      // Check for RunPod serverless health status
      if (providerType === 'runpod_serverless' && data) {
        const workers = data.workers || {};
        const isIdle = (workers.idle || 0) > 0;
        const isInitializing = (workers.initializing || 0) > 0;
        const isRunning = (workers.running || 0) > 0;
        const isReady = (workers.ready || 0) > 0;

        if (isIdle || isRunning || isReady) {
          return {
            success: true,
            status: 'online',
            latencyMs,
            message: `Online (Workers: ${workers.ready || workers.idle || 0} ready, ${workers.running || 0} active)`
          };
        } else if (isInitializing) {
          return {
            success: true,
            status: 'cold_boot',
            latencyMs,
            message: `Server Initializing / Rollout in Progress (${workers.initializing} worker(s) spinning up...)`
          };
        }
      }

      // Check if data contains models
      const detectedModels = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

      return {
        success: true,
        status: 'online',
        latencyMs,
        message: `Online (${latencyMs}ms response)`,
        detectedModels: detectedModels.map((m: any) => ({
          id: m.id || m.name || String(m),
          name: m.name || m.id || String(m)
        }))
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        status: 'offline',
        latencyMs: Date.now() - startTime,
        message: `Authentication Failed (${response.status}): Invalid GPU API Key / Token (مفتاح الـ API غير صالح)`
      };
    } else if (response.status === 404) {
      const msg = providerType === 'runpod_serverless'
        ? `RunPod Endpoint Not Found (404): Check Endpoint ID in RunPod Console (معرف الـ Endpoint غير موجود أو غير نشط في RunPod)`
        : `Endpoint URL Not Found (404): Verify Base URL path (مسار الرابط غير موجود 404)`;
      return {
        success: false,
        status: 'offline',
        latencyMs: Date.now() - startTime,
        message: msg
      };
    } else if (response.status === 503 || response.status === 504) {
      return {
        success: false,
        status: 'cold_boot',
        latencyMs: Date.now() - startTime,
        message: `Serverless Cold Start / Initializing (${response.status})`
      };
    } else {
      return {
        success: false,
        status: 'offline',
        latencyMs: Date.now() - startTime,
        message: `HTTP ${response.status}: ${response.statusText}`
      };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    const isTimeout = error.name === 'AbortError';

    return {
      success: false,
      status: 'offline',
      latencyMs: isTimeout ? 15000 : latencyMs,
      message: isTimeout ? 'Connection Timed Out (15s)' : (error.message || 'Connection unreachable')
    };
  }
}

/**
 * Automatically fetch models from a remote GPU provider endpoint
 */
export async function syncRemoteGpuModels(
  providerId: string,
  providerType: string,
  baseUrl: string,
  endpointId: string | null,
  apiKey: string
): Promise<{ success: boolean; count: number; models: any[]; message: string }> {
  const cleanKey = apiKey.trim();

  let targetUrl = baseUrl.trim().replace(/\/+$/, '');

  if (providerType === 'runpod_serverless') {
    let cleanEndpoint = (endpointId || '').trim();
    if (cleanEndpoint.includes('/v2/')) {
      cleanEndpoint = cleanEndpoint.split('/v2/')[1];
    }
    cleanEndpoint = cleanEndpoint.split('?')[0].split('#')[0].split('/')[0].trim();

    if (cleanEndpoint) {
      // 1. First attempt: Check for OpenAI-compatible vLLM endpoints on RunPod
      const vllmUrl = `https://api.runpod.ai/v2/${cleanEndpoint}/openai/v1/models`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const resp = await fetch(vllmUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': cleanKey.startsWith('Bearer ') ? cleanKey : `Bearer ${cleanKey}`
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const json: any = await resp.json();
          const rawList = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);
          if (rawList.length > 0) {
            const mapped = rawList.map((item: any) => {
              const modelId = item.id || item.name || '';
              return {
                model_id: modelId,
                name: item.name || modelId,
                task_type: detectTaskType(modelId),
                context_window: item.context_window || 32768,
                max_output_tokens: item.max_output_tokens || 4096
              };
            }).filter((m: any) => m.model_id.length > 0);

            return {
              success: true,
              count: mapped.length,
              models: mapped,
              message: `Discovered ${mapped.length} remote vLLM model(s)`
            };
          }
        }
      } catch (_) {
        clearTimeout(timeoutId);
      }

      // 2. Second attempt: For ComfyUI, Stable Diffusion, Wan, or custom Serverless workers
      // Query RunPod GraphQL API to inspect endpoint template & metadata
      try {
        const gqlRes = await fetch(`https://api.runpod.io/graphql?api_key=${cleanKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query {
              myself {
                endpoints {
                  id
                  name
                  gpuIds
                  template {
                    name
                    imageName
                  }
                }
              }
            }`
          }),
          signal: AbortSignal.timeout(10000)
        });

        if (gqlRes.ok) {
          const gqlData = await gqlRes.json();
          const endpoints = gqlData.data?.myself?.endpoints || [];
          const match = endpoints.find((e: any) => 
            e.id === cleanEndpoint || e.id.toLowerCase().replace(/1/g, 'l') === cleanEndpoint.toLowerCase().replace(/1/g, 'l')
          ) || endpoints[0];

          if (match) {
            const epName = match.name || cleanEndpoint;
            const metaString = `${epName} ${match.template?.name || ''} ${match.template?.imageName || ''}`.toLowerCase();
            const detectedTask = detectTaskType(metaString);

            // Synchronize ONLY the authentic remote endpoint returned by the server
            const serverModels = [
              {
                model_id: match.id || cleanEndpoint,
                name: epName,
                task_type: detectedTask,
                context_window: 4096,
                max_output_tokens: 4096
              }
            ];

            return {
              success: true,
              count: serverModels.length,
              models: serverModels,
              message: `Synchronized ${serverModels.length} endpoint model (${epName}) directly from server`
            };
          }
        }
      } catch (_) {}
    }
  }

  const modelsUrl = targetUrl.endsWith('/v1') ? `${targetUrl}/models` : `${targetUrl}/v1/models`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (cleanKey) {
      headers['Authorization'] = cleanKey.startsWith('Bearer ') ? cleanKey : `Bearer ${cleanKey}`;
    }

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        count: 0,
        models: [],
        message: `Remote server returned HTTP ${response.status}`
      };
    }

    const json: any = await response.json();
    const rawList = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);

    const mapped = rawList.map((item: any) => {
      const modelId = item.id || item.name || '';
      return {
        model_id: modelId,
        name: item.name || modelId,
        task_type: detectTaskType(modelId),
        context_window: item.context_window || 32768,
        max_output_tokens: item.max_output_tokens || 4096
      };
    }).filter((m: any) => m.model_id.length > 0);

    return {
      success: true,
      count: mapped.length,
      models: mapped,
      message: `Discovered ${mapped.length} remote model(s)`
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      count: 0,
      models: [],
      message: `Failed to connect to remote server: ${err.message || 'Connection error'}`
    };
  }
}

/**
 * Heuristic to classify task type based on model ID
 */
export function detectTaskType(modelId: string): 'vision_analysis' | 'image_gen' | 'video_gen' {
  const lower = modelId.toLowerCase();
  if (
    lower.includes('wan') || 
    lower.includes('video') || 
    lower.includes('animate') || 
    lower.includes('cogvideo') || 
    lower.includes('svd') || 
    lower.includes('veo') || 
    lower.includes('sora') || 
    lower.includes('hunyuan') || 
    lower.includes('mochi') || 
    lower.includes('ltx') || 
    lower.includes('luma') || 
    lower.includes('kling') || 
    lower.includes('pika') || 
    lower.includes('gen3') || 
    lower.includes('minimax') || 
    lower.includes('t2v') || 
    lower.includes('i2v') || 
    lower.includes('v2v')
  ) {
    return 'video_gen';
  }
  if (lower.includes('comfy') || lower.includes('flux') || lower.includes('diffusion') || lower.includes('sdxl') || lower.includes('stable') || lower.includes('midjourney') || lower.includes('image')) {
    return 'image_gen';
  }
  // Default to vision analysis for multimodal LLMs (e.g. Qwen2.5-VL, Llama-Vision, Pixtral, InternVL)
  return 'vision_analysis';
}
