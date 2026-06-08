import { pool } from '../../db/index.js';
import { getProviderKey } from '../ai.js';
import { logSystemActivity } from '../notifications.js';
import { saveGeneratedImageToDisk } from '../files.js';
import { 
  withTimeout, 
  safeParseResponse, 
  safeDecrementOnFailure, 
  validateModelCapacityCached,
  AI_CALL_TIMEOUT_MS,
  IMG_TIMEOUT_MS
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
    const validation = validateModelCapacityCached(
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
          console.warn(`[Image Task] Model '${cleanModel}' is not officially supported by Imagen. Proceeding with caution.`);
        }

        // Standardize Google Imagen to :predict endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:predict`;
        const requestBody = {
          instances: [
            { prompt: finalPrompt }
          ],
          parameters: {
            numberOfImages: 1,
            aspectRatio: aspectRatio,
            outputMimeType: 'image/jpeg'
          }
        };

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
