import { pool } from '../../db/index.js';
import { getProviderKey } from '../ai.js';
import { logSystemActivity } from '../notifications.js';
import { saveGeneratedImageToDisk } from '../files.js';
import { 
  withTimeout, 
  safeParseResponse, 
  safeDecrementOnFailure, 
  validateProviderCapacity,
  IMG_TIMEOUT_MS,
  getNestedField
} from './utils.js';
import { GoogleGenAI } from "@google/genai";

import type { TaskExecutionContext } from '../orchestratorRegistry.js';

/**
 * Resolves standard aspect ratio dimensions for Together and Stability AI.
 * Handles explicit wide, vertical, and classic photographic framing modes.
 */
function resolveImageDimensions(aspectRatio: string): { width: number; height: number } {
  if (aspectRatio === '16:9') {
    return { width: 1344, height: 768 };
  } else if (aspectRatio === '9:16') {
    return { width: 768, height: 1344 };
  } else if (aspectRatio === '4:3') {
    return { width: 1152, height: 864 };
  } else if (aspectRatio === '3:2') {
    return { width: 1152, height: 768 };
  }
  return { width: 1024, height: 1024 };
}

/**
 * Executes dynamic, provider-agnostic protocol logic configured from the database.
 * Supports sync (Direct API response) and polling (asynchronous multi-step state loop).
 */
async function executeDynamicImageProtocol(
  protocol: any,
  apiKey: string,
  modelName: string,
  prompt: string,
  aspectRatio: string,
  quality: string,
  style: string,
  signal: AbortSignal
): Promise<string> {
  const method = (protocol.method || 'POST').toUpperCase();
  const endpoint = protocol.endpoint || protocol.init_endpoint || '';
  if (!endpoint) {
    throw new Error('Image Protocol Configuration error: missing endpoint/init_endpoint.');
  }

  const authHeader = protocol.auth_header || 'Authorization';
  const authPrefix = protocol.auth_prefix !== undefined ? protocol.auth_prefix : 'Bearer';
  const authValue = authPrefix ? `${authPrefix} ${apiKey}`.trim() : apiKey;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(protocol.extra_headers || {})
  };
  if (authHeader) {
    headers[authHeader] = authValue;
  }

  const { width, height } = resolveImageDimensions(aspectRatio);

  let body: any;
  if (protocol.body_wrapper === 'version_input') {
    body = {
      version: modelName,
      input: {
        prompt,
        width,
        height,
        aspect_ratio: aspectRatio,
        quality,
        style
      }
    };
  } else {
    body = {
      model: modelName,
      prompt,
      n: 1,
      width,
      height,
      size: `${width}x${height}`,
      response_format: protocol.result_type === 'base64' ? 'b64_json' : 'url',
      aspect_ratio: aspectRatio,
      quality,
      style
    };
  }

  const requestOptions: RequestInit = {
    method,
    headers,
    signal
  };
  if (method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  const res = await fetch(endpoint, requestOptions);
  const data = await safeParseResponse(res, 'Dynamic Image API Generation request failed');

  if (protocol.type === 'polling' || protocol.poll_endpoint) {
    const taskId = data.id || data.task_id || getNestedField(data, protocol.poll_id_field || 'id');
    if (!taskId) {
      throw new Error('Dynamic polling initialization failed: Task ID is missing from response payload.');
    }

    const pollRawEndpoint = protocol.poll_endpoint || `${endpoint}/${taskId}`;
    const pollEndpoint = pollRawEndpoint.replace('{id}', taskId).replace('{task_id}', taskId);

    const maxPolls = protocol.max_polls || 40;
    const interval = protocol.poll_interval_ms || 2000;
    const successValue = protocol.poll_success_value || 'succeeded';
    const statusField = protocol.poll_status_field || 'status';
    const failValue = protocol.poll_fail_value || 'failed';

    for (let i = 0; i < maxPolls; i++) {
      if (signal.aborted) {
        throw new Error('Image polling timed out or aborted.');
      }
      await new Promise(resolve => setTimeout(resolve, interval));

      const pollRes = await fetch(pollEndpoint, {
        method: 'GET',
        headers: {
          ...(authHeader ? { [authHeader]: authValue } : {}),
          ...(protocol.extra_headers || {})
        },
        signal
      });
      const pollData = await safeParseResponse(pollRes, 'Dynamic polling step failed');
      const status = String(getNestedField(pollData, statusField) || '').toLowerCase();

      if (status === successValue.toLowerCase()) {
        const value = getNestedField(pollData, protocol.result_field || 'output[0]');
        if (!value) {
          throw new Error('Result field was empty on succeeded dynamic poll response.');
        }
        return protocol.result_type === 'base64' ? `data:image/png;base64,${value}` : value;
      }

      if (status === failValue.toLowerCase()) {
        const errorDetail = pollData.error || pollData.message || 'Execution failed';
        throw new Error(`Dynamic API task failed: ${JSON.stringify(errorDetail)}`);
      }
    }
    throw new Error(`Image generation polling timed out after ${maxPolls * interval / 1000} seconds.`);
  }

  const resultField = protocol.result_field || 'data[0].url';
  let value = getNestedField(data, resultField);
  if (!value) {
    value = data?.data?.[0]?.url || data?.data?.[0]?.b64_json || data?.url || data?.image || data?.output?.[0] || data?.output;
  }

  if (!value) {
    throw new Error(`Result field '${resultField}' was empty in dynamic API response.`);
  }

  if (protocol.result_type === 'base64' || (value.length > 1000 && !value.includes(':'))) {
    return value.startsWith('data:') ? value : `data:image/png;base64,${value}`;
  }
  return value;
}

export async function executeImageTask(ctx: TaskExecutionContext): Promise<{ result: string }> {
  const { reqBody, userId, route, quotaCheck, walletCharged } = ctx;
  let { finalPrompt } = ctx;
  const toolIdStr = 'image';

  const imageSettings = reqBody.image_settings || {};
  const selectedRatio = String(imageSettings.aspectRatio || '1:1');

  // Build the fallback chain routing targets array
  const targets = [
    { provider: route.primary_provider, model: route.primary_model, label: 'primary' },
    { provider: route.fallback_1_provider, model: route.fallback_1_model, label: 'fallback_1' },
    { provider: route.fallback_2_provider, model: route.fallback_2_model, label: 'fallback_2' },
    { provider: route.fallback_3_provider, model: route.fallback_3_model, label: 'fallback_3' }
  ].filter(t => t.provider && t.model);

  if (targets.length === 0) {
    await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
    throw new Error(JSON.stringify({
      error: "No active image providers or routing pathways found in your system configuration.",
      error_ar: "لم يتم العثور على أي مزودي خدمة أو مسارات نماذج نشطة في إعدادات النظام الحالية.",
      type: "SYSTEM_INACTIVE"
    }));
  }

  // Pre-fetch all targets configuration from api_keys_vault inside a single consolidated query
  const vaultMap = new Map<string, any>();
  try {
    const providerNames = targets.map(t => t.provider.toLowerCase().replace(/\s+/g, ''));
    const result = await pool.query(
      'SELECT provider, is_active, daily_budget, used_today, url_key, protocol_config FROM api_keys_vault WHERE provider = ANY($1)',
      [providerNames]
    );
    for (const row of result.rows) {
      vaultMap.set(row.provider, row);
    }
  } catch (err: any) {
    console.warn('[Image Task Pre-fetch] Failed to pre-load configuration keys:', err.message);
  }

  // Synthesize prompts with structured stylistic modifiers
  let promptPrefix = '';
  let promptSuffix = '';
  const selectedStyle = String(imageSettings.style || 'Cinematic').toLowerCase().trim();

  // If the prompt is already highly detailed and long (e.g. > 150 chars), avoid force-feeding heavy prefaces
  const isCustomDetailedPrompt = finalPrompt.length > 150;

  if (!isCustomDetailedPrompt) {
    if (selectedStyle.includes('cinematic') || selectedStyle.includes('سينمائي')) {
      promptPrefix = 'Photorealistic film still, cinematic composition, golden hour side-lighting, atmospheric haze, deep volumetric shadows, film textures, ';
    } else if (selectedStyle.includes('realistic') || selectedStyle.includes('واقعي')) {
      promptPrefix = 'Realistic professional photograph, 80mm lens, tack-sharp central focus with natural bokeh, realistic lighting, ';
    } else if (selectedStyle.includes('anime') || selectedStyle.includes('أنمي') || selectedStyle.includes('انمي')) {
      promptPrefix = 'Japanese anime illustration key visual, hand-painted background aesthetic, clean linework, beautiful digital lighting, ';
    } else if (selectedStyle.includes('digital') || selectedStyle.includes('فن رقمي')) {
      promptPrefix = 'Digital art masterpiece, fantasy concept art, rich color palette, depth, Trending on ArtStation, ';
    } else {
      promptPrefix = 'High-fidelity professional masterpiece, carefully arranged composition, clean lighting, ';
    }
  }

  if (selectedRatio === '16:9') {
    promptSuffix += ' Optimized widescreen panoramic framing.';
  } else if (selectedRatio === '9:16') {
    promptSuffix += ' Elegant vertical composition framing.';
  } else if (selectedRatio === '4:3' || selectedRatio === '3:2') {
    promptSuffix += ' Landscape classic framing alignment.';
  } else {
    promptSuffix += ' Balanced central aspect ratio framing.';
  }

  const selectedQuality = String(imageSettings.quality || 'HD').toLowerCase().trim();
  if (selectedQuality === 'ultra' || selectedQuality === 'hd' || selectedQuality === 'high') {
    promptSuffix += ' High resolution details, clear textures.';
  }

  promptSuffix += ' [Constraint: high-quality, clear limbs and faces].';

  // Enforce prompt length boundary to prevent API context overflows while preserving the critical suffixes
  const available = 4000 - promptPrefix.length - promptSuffix.length;
  const trimmedCore = finalPrompt.substring(0, Math.max(200, available));
  finalPrompt = promptPrefix + trimmedCore + promptSuffix;

  let imageUrl = '';
  let successfulProvider = '';
  let successfulModel = '';

  for (const target of targets) {
    const providerId = target.provider.toLowerCase().replace(/\s+/g, '');
    const modelToUse = target.model || '';

    console.log(`[Image Orchestrator] Processing Route Pathway [${target.label}]: ${providerId} - ${modelToUse}`);

    const vaultConfig = vaultMap.get(providerId);

    // Dynamic pre-flight performance checks
    const validation = validateProviderCapacity(
      vaultConfig,
      providerId,
      route.cost_per_usage || 0
    );

    if (!validation.valid) {
      console.warn(`[Image Orchestrator Check] Skipping ${providerId} because: ${validation.warning}`);
      continue;
    }

    const apiKey = await getProviderKey(providerId);
    if (!apiKey) {
      console.warn(`[Image Orchestrator Check] Missing associated API key for ${providerId}. Skipping.`);
      continue;
    }

    try {
      // Prioritize modern dynamic protocol configuration if present to enable zero-code scaling
      const dynamicProtocol = vaultConfig?.protocol_config || (route as any).protocol_config;
      const possessesCustomProtocol = dynamicProtocol && typeof dynamicProtocol === 'object' && Object.keys(dynamicProtocol).length > 0;

      if (possessesCustomProtocol) {
        console.log(`[Image Task] Dynamic Protocol intercepted for '${providerId}' using config:`, JSON.stringify(dynamicProtocol));
        imageUrl = await withTimeout(
          (signal) => executeDynamicImageProtocol(
            dynamicProtocol,
            apiKey,
            modelToUse,
            finalPrompt,
            imageSettings.aspectRatio || '1:1',
            imageSettings.quality || 'HD',
            imageSettings.style || 'Cinematic',
            signal
          ),
          IMG_TIMEOUT_MS,
          `dynamic-image-generation-${providerId}`
        );
      } else if (providerId === 'openai') {
        const aspectRatio = imageSettings.aspectRatio || '1:1';
        const size =
          aspectRatio === '16:9' ? '1792x1024' :
          aspectRatio === '9:16' ? '1024x1792' :
          '1024x1024';
        const quality = imageSettings.quality === 'Ultra' ? 'hd' : 'standard';
        const style = imageSettings.style === 'واقعي' || imageSettings.style === 'Realistic' ? 'natural' : 'vivid';

        const res = await withTimeout(
          (signal) => fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelToUse, prompt: finalPrompt, n: 1, size, quality, style }),
            signal
          }),
          IMG_TIMEOUT_MS,
          'openai-image'
        );
        const data = await safeParseResponse(res, 'OpenAI image API error');
        imageUrl = data.data?.[0]?.url || '';

      } else if (providerId === 'together') {
        const { width, height } = resolveImageDimensions(imageSettings.aspectRatio || '1:1');

        const res = await withTimeout(
          (signal) => fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelToUse, prompt: finalPrompt, n: 1, width, height }),
            signal
          }),
          IMG_TIMEOUT_MS,
          'together-image'
        );
        const data = await safeParseResponse(res, 'Together image API error');
        imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json || '';

      } else if (providerId === 'stabilityai' || providerId === 'stability') {
        const { width, height } = resolveImageDimensions(imageSettings.aspectRatio || '1:1');

        const res = await withTimeout(
          (signal) => fetch(`https://api.stability.ai/v1/generation/${modelToUse}/text-to-image`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              text_prompts: [{ text: finalPrompt, weight: 1 }],
              width, height,
              steps: imageSettings.quality === 'Ultra' ? 50 : 30,
              samples: 1
            }),
            signal
          }),
          IMG_TIMEOUT_MS,
          'stability-image'
        );
        const data = await safeParseResponse(res, 'Stability AI error');
        const b64 = data.artifacts?.[0]?.base64;
        imageUrl = b64 ? `data:image/png;base64,${b64}` : '';

      } else if (providerId === 'replicate') {
        const resultUrl = await withTimeout(
          async (signal) => {
            const predRes = await fetch('https://api.replicate.com/v1/predictions', {
              method: 'POST',
              headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: modelToUse, input: { prompt: finalPrompt } }),
              signal
            });
            const prediction = await safeParseResponse(predRes, 'Replicate error');
            const pollUrl = prediction.urls?.get;
            if (!pollUrl) {
              throw new Error('Replicate did not return a polling URL.');
            }

            for (let i = 0; i < 40; i++) {
              if (signal.aborted) {
                throw new Error('Replicate polling aborted due to timeout.');
              }
              await new Promise(r => setTimeout(r, 2000));
              const poll = await fetch(pollUrl, { 
                headers: { 'Authorization': `Token ${apiKey}` },
                signal 
              });
              const pollData = await safeParseResponse(poll, 'Replicate pull error');
              if (pollData.status === 'succeeded') {
                return Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
              }
              if (pollData.status === 'failed') throw new Error('Replicate generation failed');
            }
            throw new Error('Replicate image polling timed out after 80s without result.');
          },
          IMG_TIMEOUT_MS,
          'replicate-image-full'
        );
        imageUrl = resultUrl;

      } else if (providerId === 'google' || providerId === 'gemini') {
        const aspectRatio = imageSettings.aspectRatio || '1:1';
        let cleanModel = modelToUse;
        
        if (cleanModel.startsWith('models/')) {
          cleanModel = cleanModel.substring(7);
        }

        const SUPPORTED_IMAGEN_MODELS = [
          'imagen-3.0-generate-002',
          'imagen-3.0-fast-generate-001',
          'imagen-2.0-generate-002',
          'imagen-3.5-generate-001',
          'imagen-3.5-fast-generate-001'
        ];
        if (!SUPPORTED_IMAGEN_MODELS.includes(cleanModel)) {
          console.warn(`[Image Task] Model '${cleanModel}' is not in the verified Google Imagen presets. Proceeding directly with model parameters...`);
        }

        // Call Imagen using our official modern @google/genai SDK pattern
        const aiObj = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });

        const imageResponse = await withTimeout(
          () => aiObj.models.generateImages({
            model: cleanModel,
            prompt: finalPrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: aspectRatio as any
            }
          }),
          IMG_TIMEOUT_MS,
          'google-image'
        );

        const base64Bytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
        imageUrl = base64Bytes ? `data:image/jpeg;base64,${base64Bytes}` : '';
      } else {
        // Fallback or generic path for modern custom/open-source models and arbitrary providers (C-4)
        const finalEndpoint = vaultConfig?.url_key;
        if (!finalEndpoint) {
          throw new Error(`Orchestration routing check: Dynamic provider '${target.provider}' has unsupported providerId '${providerId}' and is missing a registered custom endpoint URL (url_key) in the vault.`);
        }

        console.log(`[Image Task] Executing generic/custom endpoint generation for provider: ${providerId} on endpoint: ${finalEndpoint}`);

        const { width, height } = resolveImageDimensions(imageSettings.aspectRatio || '1:1');

        const res = await withTimeout(
          (signal) => fetch(finalEndpoint, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${apiKey}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
              model: modelToUse,
              prompt: finalPrompt,
              width,
              height,
              n: 1,
              response_format: 'url',
              size: `${width}x${height}`
            }),
            signal
          }),
          IMG_TIMEOUT_MS,
          'generic-image-generation'
        );

        const resData = await safeParseResponse(res, `Dynamic API response status from ${target.provider}`);
        
        const genericUrl = 
          resData?.data?.[0]?.url || 
          resData?.data?.[0]?.b64_json ||
          resData?.video_url || 
          resData?.url || 
          resData?.image_url ||
          resData?.image ||
          resData?.generatedImages?.[0]?.image?.imageBytes || 
          (Array.isArray(resData?.output) ? resData.output[0] : resData?.output) || 
          '';

        if (!genericUrl) {
          throw new Error(`Dynamic endpoint on provider '${target.provider}' did not return a valid image URL or base64 field.`);
        }

        if (genericUrl.startsWith('iVBORw0KGgo') || (genericUrl.length > 1000 && !genericUrl.includes(':'))) {
          imageUrl = `data:image/png;base64,${genericUrl}`;
        } else {
          imageUrl = genericUrl;
        }
      }

      if (imageUrl) {
        successfulProvider = providerId;
        successfulModel = modelToUse;
        console.log(`[Image Orchestrator] Target [${target.label}] (${providerId}) generated successfully!`);
        break;
      }
    } catch (err: any) {
      console.warn(`[Image Orchestrator] Target [${target.label}] (${providerId}) failed. Transitioning...`, err.message);
    }
  }

  if (!imageUrl) {
    await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
    throw new Error(JSON.stringify({
      error: "All configured image generation providers in the fallback chain failed or returned empty results.",
      error_ar: "فشلت جميع مسارات المزودين التبادلية لتوليد الصور أو أعادت نتائج فارغة.",
      type: "GENERATION_ERROR"
    }));
  }

  let savedUrl = imageUrl;
  try {
    // Write image bytes to secure disk to minimize WS load
    savedUrl = await saveGeneratedImageToDisk(String(userId), imageUrl);
  } catch (saveErr: any) {
    console.warn('[Image Task] Silent warning: failed to save image locally, fallback to original or base64 URL.', saveErr.message);
  }

  try {
    const estimatedCost = (route.cost_per_usage || 0) / 1000;
    if (estimatedCost > 0 && successfulProvider) {
      await pool.query(
        'UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
        [estimatedCost, successfulProvider]
      );
    }

    await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `Image generated via ${successfulProvider}/${successfulModel}`, { toolIdStr, provider: successfulProvider });

    const savedUrlWithAspect = `${savedUrl}#aspect=${selectedRatio}`;
    return { result: `![Generated Image](${savedUrlWithAspect})` };
  } catch (imgErr: any) {
    console.error('[Orchestrator Image] Silent warning: ledger or system activity logging failed but returning image anyway:', imgErr.message);
    const savedUrlWithAspect = `${savedUrl}#aspect=${selectedRatio}`;
    return { result: `![Generated Image](${savedUrlWithAspect})` };
  }
}
