import { pool } from '../../db/index.js';
import { getProviderKey } from '../ai.js';
import { logSystemActivity } from '../notifications.js';
import { saveGeneratedImageToDisk } from '../files.js';
import { 
  withTimeout, 
  safeParseResponse, 
  safeDecrementOnFailure, 
  validateProviderCapacity,
  IMG_TIMEOUT_MS
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
      'SELECT provider, is_active, daily_budget, used_today, url_key FROM api_keys_vault WHERE provider = ANY($1)',
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
      if (providerId === 'openai') {
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
          throw new Error(`Google Imagen check: model '${cleanModel}' is unsupported. Allowed models: ${SUPPORTED_IMAGEN_MODELS.join(', ')}`);
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
