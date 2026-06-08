import { pool } from '../../db/index.js';
import { getProviderKey } from '../ai.js';
import { logSystemActivity } from '../notifications.js';
import { saveGeneratedImageToDisk } from '../files.js';
import { 
  withTimeout, 
  safeParseResponse, 
  safeDecrementOnFailure, 
  AI_CALL_TIMEOUT_MS 
} from './utils.js';

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
 * Validates available provider daily budgets, quota limits, and system activation status.
 */
function validateImageModelCapacityCached(
  vaultConfig: any,
  providerId: string,
  costPerUsage: number
): { warning?: string; valid: boolean } {
  if (!providerId) return { valid: true };

  if (!vaultConfig) {
    return { 
      valid: false, 
      warning: `Provider check: '${providerId}' has no registered configuration keys in the vault.` 
    };
  }

  const { is_active, daily_budget, used_today } = vaultConfig;

  if (!is_active) {
    return { 
      valid: false, 
      warning: `Provider check: '${providerId}' is currently turned off or set to inactive.` 
    };
  }

  const budget = parseFloat(daily_budget || '0');
  const used = parseFloat(used_today || '0');
  const estimatedCost = (costPerUsage || 0) / 1000;

  if (budget > 0 && (used + estimatedCost) > budget) {
    return { 
      valid: false, 
      warning: `Provider check: '${providerId}' daily running budget of ${budget} is fully used.` 
    };
  }

  return { valid: true };
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

  if (selectedStyle.includes('cinematic') || selectedStyle.includes('سينمائي')) {
    promptPrefix = 'Elite cinematic masterwork film still, captured on Arri Alexa LF with Master Anamorphic lenses, striking cinematic composition, highly dramatic golden hour side-lighting, cinematic atmospheric haze, deep volumetric shadows, stunning photorealism, award-winning cinematography, hyper-realistic film grain and textures, high dynamic range color grading, ';
  } else if (selectedStyle.includes('realistic') || selectedStyle.includes('واقعي')) {
    promptPrefix = 'Pristine, award-winning, documentary-grade professional masterwork photograph, shot on a Hasselblad H6D-100c medium format camera with 80mm lens, f/4.0 aperture for tack-sharp central focus with subtle natural bokeh, raw life representation, immaculate realistic skin pores and material details, flawless realistic lighting without artificial shadows, calibrated color space, ';
  } else if (selectedStyle.includes('anime') || selectedStyle.includes('أنمي') || selectedStyle.includes('انمي')) {
    promptPrefix = 'Spectacular custom Japanese anime key visual, highly authentic high-budget anime studio illustration, drawn in the legendary style of CoMix Wave Films and Kyoto Animation, beautiful celestial skies with scattered god-rays, hand-painted aesthetic, flawless clean digital linework, highly professional and clean cel shading, exquisite anime lighting, ';
  } else if (selectedStyle.includes('digital') || selectedStyle.includes('فن رقمي')) {
    promptPrefix = 'Premier state-of-the-art custom digital art masterpiece, highly complex fantasy concept art, mesmerizing color palette with ambient occlusion, dramatic octane-rendered visual depth, Intricate geometric details, crisp digital brush strokes, perfect visual equilibrium, Trending on ArtStation, ';
  } else {
    promptPrefix = 'Ultra-high-fidelity professional masterpiece, carefully arranged composition, impeccable lighting structure, meticulous micro-details, ';
  }

  if (selectedRatio === '16:9') {
    promptSuffix += ' Optimized widescreen panoramic composition, grand architectural horizon view, cinematic wide-angle lens perspective, balanced symmetric rule-of-thirds composition.';
  } else if (selectedRatio === '9:16') {
    promptSuffix += ' Elegant vertical composition, majestic full-body vertical alignment, pristine vertical symmetry, optimized mobile digital screen format.';
  } else if (selectedRatio === '4:3' || selectedRatio === '3:2') {
    promptSuffix += ' Landscape classic layout alignment, professional framing, balanced depth of field, optimized classic focal parameters.';
  } else {
    promptSuffix += ' Flawless central aspect ratio composition, perfect radial symmetry and balancing.';
  }

  const selectedQuality = String(imageSettings.quality || 'HD').toLowerCase().trim();
  if (selectedQuality === 'ultra' || selectedQuality === 'hd' || selectedQuality === 'high') {
    promptSuffix += ' Rendered in meticulous 8k resolution, ultra-fine pixel matrix depth, volumetric light particles, global illumination, raytraced reflection fidelity, intricate subsurface scattering on micro-surfaces, flawless depth maps, crisp textures.';
  }

  promptSuffix += ' [CRITICAL CONSTRAINT: Ensure perfect anatomy, zero anatomical anomalies, correct number of fingers, correct limbs, no draft marks or sketch lines, no text overlapping, no watermarks, no signatures, no blurry segments, pristine visual clarity].';

  finalPrompt = `${promptPrefix}${finalPrompt}${promptSuffix}`;

  // Enforce prompt length boundary to prevent API context overflows
  if (finalPrompt.length > 4000) {
    finalPrompt = finalPrompt.substring(0, 4000);
  }

  let imageUrl = '';
  let successfulProvider = '';
  let successfulModel = '';

  for (const target of targets) {
    const providerId = target.provider.toLowerCase().replace(/\s+/g, '');
    const modelToUse = target.model || '';

    console.log(`[Image Orchestrator] Processing Route Pathway [${target.label}]: ${providerId} - ${modelToUse}`);

    const vaultConfig = vaultMap.get(providerId);

    // Dynamic pre-flight performance checks
    const validation = validateImageModelCapacityCached(
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
          AI_CALL_TIMEOUT_MS,
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
          AI_CALL_TIMEOUT_MS,
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
          AI_CALL_TIMEOUT_MS,
          'stability-image'
        );
        const data = await safeParseResponse(res, 'Stability AI error');
        const b64 = data.artifacts?.[0]?.base64;
        imageUrl = b64 ? `data:image/png;base64,${b64}` : '';

      } else if (providerId === 'replicate') {
        const res = await withTimeout(
          (signal) => fetch('https://api.replicate.com/v1/predictions', {
            method: 'POST',
            headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: modelToUse, input: { prompt: finalPrompt } }),
            signal
          }),
          AI_CALL_TIMEOUT_MS,
          'replicate-image-init'
        );
        const prediction = await safeParseResponse(res, 'Replicate error');

        let pollUrl = prediction.urls?.get;
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 2000));
          const poll = await fetch(pollUrl, { headers: { 'Authorization': `Token ${apiKey}` } });
          const pollData = await safeParseResponse(poll, 'Replicate pull error');
          if (pollData.status === 'succeeded') {
            imageUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
            break;
          }
          if (pollData.status === 'failed') throw new Error('Replicate generation failed');
        }

        if (!imageUrl) {
          throw new Error('Replicate image polling timed out after 60s without result.');
        }

      } else if (providerId === 'google' || providerId === 'gemini') {
        const aspectRatio = imageSettings.aspectRatio || '1:1';
        let cleanModel = modelToUse;
        
        if (cleanModel.startsWith('models/')) {
          cleanModel = cleanModel.substring(7);
        }

        // isPredictModel should check for imagen-4.0 only (Veo is for videos)
        const isPredictModel = cleanModel.toLowerCase().includes('imagen-4.0');

        let url = '';
        let requestBody = {};

        if (isPredictModel) {
          url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:predict`;
          requestBody = {
            instances: [
              { prompt: finalPrompt }
            ],
            parameters: {
              numberOfImages: 1,
              aspectRatio: aspectRatio,
              outputMimeType: 'image/jpeg'
            }
          };
        } else {
          url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateImages`;
          requestBody = {
            prompt: finalPrompt,
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio
          };
        }

        const res = await withTimeout(
          (signal) => fetch(url, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify(requestBody),
            signal
          }),
          AI_CALL_TIMEOUT_MS,
          'google-image'
        );
        const data = await safeParseResponse(res, 'Google Imagen API error');
        const base64 = data.generatedImages?.[0]?.image?.imageBytes || data.predictions?.[0]?.bytesBase64Encoded;
        imageUrl = base64 ? `data:image/jpeg;base64,${base64}` : '';
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
    throw new Error('All configured image generation providers in the fallback chain failed or returned empty results.');
  }

  try {
    // Write image bytes to secure disk to minimize WS load
    const savedUrl = await saveGeneratedImageToDisk(String(userId), imageUrl);

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
    await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
    console.error('[Orchestrator Image] Critical ledger registration failure:', imgErr.message);
    throw new Error(JSON.stringify({
      error: `Image saving or logging operations failed: ${imgErr.message}`,
      error_ar: `فشل تسجيل وحفظ ملف الصورة المعالج: ${imgErr.message}`,
      type: "GENERATION_ERROR"
    }));
  }
}
