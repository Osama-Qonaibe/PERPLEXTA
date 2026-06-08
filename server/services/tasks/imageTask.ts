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

export async function executeImageTask(ctx: TaskExecutionContext): Promise<{ result: string }> {
  const { reqBody, userId, route, quotaCheck, walletCharged } = ctx;
  let { finalPrompt } = ctx;
  const toolIdStr = 'image';

  const imageSettings = reqBody.image_settings || {};
  const providerId = route.primary_provider.toLowerCase().replace(/\s+/g, '');
  const apiKey = await getProviderKey(providerId);

  if (!apiKey) {
    await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
    throw new Error(JSON.stringify({
      error: "Image generation service is temporarily unavailable. No active API key found.",
      error_ar: "خدمة توليد الصور غير متاحة حالياً. لا يوجد مفتاح API نشط.",
      type: "SYSTEM_INACTIVE"
    }));
  }

  // ─── ELITE-GRADE MULTI-TIER PROMPT SYNTHESIS ENGINE ───
  let promptPrefix = '';
  let promptSuffix = '';
  const selectedStyle = String(imageSettings.style || 'Cinematic').toLowerCase().trim();

  // 1. Establish Professional Style Prefix Architecture
  if (selectedStyle.includes('cinematic') || selectedStyle.includes('سينمائي')) {
    promptPrefix = 'Elite cinematic masterwork film still, captured on Arri Alexa LF with Master Anamorphic lenses, striking cinematic composition, highly dramatic golden hour side-lighting, cinematic atmospheric haze, deep volumetric shadows, stunning photorealism, award-winning cinematography, hyper-realistic film grain and textures, high dynamic range color grading, ';
  } else if (selectedStyle.includes('realistic') || selectedStyle.includes('واقعي')) {
    promptPrefix = 'Pristine, award-winning, documentary-grade professional masterwork photograph, shot on a Hasselblad H6D-100c medium format camera with 80mm lens, f/4.0 aperture for tack-sharp central focus with subtle natural bokeh, raw life representation, immaculate realistic skin pores and material details, flawless realistic lighting without artificial shadows, calibrated color space, ';
  } else if (selectedStyle.includes('anime') || selectedStyle.includes('أنمي') || selectedStyle.includes('انمي')) {
    promptPrefix = 'Spectacular custom Japanese anime key visual, highly authentic high-budget anime studio illustration, drawn in the legendary style of CoMix Wave Films and Kyoto Animation, beautiful celestial skies with scattered god-rays, hand-painted aesthetic, flawless clean digital linework, highly professional and clean cel shading, exquisite anime lighting, ';
  } else if (selectedStyle.includes('digital') || selectedStyle.includes('فن رقمي')) {
    promptPrefix = 'Premier state-of-the-art custom digital art masterpiece, highly complex fantasy concept art, mesmerizing color palette with ambient occlusion, dramatic octane-rendered visual depth, Intricate geometric details, crisp digital brush strokes, perfect visual equilibrium, Trending on ArtStation, ';
  } else {
    // High-performance neutral defaults
    promptPrefix = 'Ultra-high-fidelity professional masterpiece, carefully arranged composition, impeccable lighting structure, meticulous micro-details, ';
  }

  // 2. Establish Technical Quality & Aspect Ratio Suffix Architecture
  const selectedRatio = String(imageSettings.aspectRatio || '1:1');
  if (selectedRatio === '16:9') {
    promptSuffix += ' Optimized widescreen panoramic composition, grand architectural horizon view, cinematic wide-angle lens perspective, balanced symmetric rule-of-thirds composition.';
  } else if (selectedRatio === '9:16') {
    promptSuffix += ' Elegant vertical composition, majestic full-body vertical alignment, pristine vertical symmetry, optimized mobile digital screen format.';
  } else if (selectedRatio === '4:3' || selectedRatio === '3:2') {
    promptSuffix += ' Landscape classic layout alignment, professional framing, balanced depth of field, optimized classic focal parameters.';
  } else {
    promptSuffix += ' Flawless central aspect ratio composition, perfect radial symmetry and balancing.';
  }

  // 3. Add High-Performance Quality Render Configurations (Ultra / HD)
  const selectedQuality = String(imageSettings.quality || 'HD').toLowerCase().trim();
  if (selectedQuality === 'ultra' || selectedQuality === 'hd' || selectedQuality === 'high') {
    promptSuffix += ' Rendered in meticulous 8k resolution, ultra-fine pixel matrix depth, volumetric light particles, global illumination, raytraced reflection fidelity, intricate subsurface scattering on micro-surfaces, flawless depth maps, crisp textures.';
  }

  // 4. Inject Strict Imperative Negative Parameter Safeguards against AI defects
  promptSuffix += ' [CRITICAL CONSTRAINT: Ensure perfect anatomy, zero anatomical anomalies, correct number of fingers, correct limbs, no draft marks or sketch lines, no text overlapping, no watermarks, no signatures, no blurry segments, pristine visual clarity].';

  // 5. Synthesize Final Elite Prompt Struct
  finalPrompt = `${promptPrefix}${finalPrompt}${promptSuffix}`;

  let imageUrl = '';

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
        fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: route.primary_model, prompt: finalPrompt, n: 1, size, quality, style })
        }),
        AI_CALL_TIMEOUT_MS,
        'openai-image'
      );
      const data = await safeParseResponse(res, 'OpenAI image API error');
      imageUrl = data.data?.[0]?.url || '';

    } else if (providerId === 'together') {
      const aspectRatio = imageSettings.aspectRatio || '1:1';
      const width = aspectRatio === '16:9' ? 1344 : aspectRatio === '9:16' ? 768 : 1024;
      const height = aspectRatio === '9:16' ? 1344 : aspectRatio === '16:9' ? 768 : 1024;

      const res = await withTimeout(
        fetch('https://api.together.xyz/v1/images/generations', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: route.primary_model, prompt: finalPrompt, n: 1, width, height })
        }),
        AI_CALL_TIMEOUT_MS,
        'together-image'
      );
      const data = await safeParseResponse(res, 'Together image API error');
      imageUrl = data.data?.[0]?.url || data.data?.[0]?.b64_json || '';

    } else if (providerId === 'stabilityai' || providerId === 'stability') {
      const aspectRatio = imageSettings.aspectRatio || '1:1';
      const width = aspectRatio === '16:9' ? 1344 : aspectRatio === '9:16' ? 768 : 1024;
      const height = aspectRatio === '9:16' ? 1344 : aspectRatio === '16:9' ? 768 : 1024;

      const res = await withTimeout(
        fetch(`https://api.stability.ai/v1/generation/${route.primary_model}/text-to-image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            text_prompts: [{ text: finalPrompt, weight: 1 }],
            width, height,
            steps: imageSettings.quality === 'Ultra' ? 50 : 30,
            samples: 1
          })
        }),
        AI_CALL_TIMEOUT_MS,
        'stability-image'
      );
      const data = await safeParseResponse(res, 'Stability AI error');
      const b64 = data.artifacts?.[0]?.base64;
      imageUrl = b64 ? `data:image/png;base64,${b64}` : '';

    } else if (providerId === 'replicate') {
      const res = await withTimeout(
        fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: route.primary_model, input: { prompt: finalPrompt } })
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
    } else if (providerId === 'google' || providerId === 'gemini') {
      const aspectRatio = imageSettings.aspectRatio || '1:1';
      let modelName = route.primary_model || 'imagen-4.0-generate-001';
      
      // Strip leading 'models/' prefix if present
      if (modelName.startsWith('models/')) {
        modelName = modelName.substring(7);
      }

      // Safety override: if model name is empty or belongs to standard non-image text models (e.g. standard text gemini), fallback to a high-performance default image model
      const lowerName = modelName.toLowerCase();
      if (
        !lowerName ||
        (lowerName.includes('gemini') && !lowerName.includes('image')) ||
        lowerName.includes('gemma') ||
        lowerName.includes('pro-preview-tts')
      ) {
        modelName = 'imagen-4.0-generate-001';
      }

      // Detect if this is an imagen-4.0 model or any other vertex-served predict-based model
      const isPredictModel = modelName.toLowerCase().includes('imagen-4.0') || modelName.toLowerCase().includes('veo');

      let url = '';
      let requestBody = {};

      if (isPredictModel) {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict`;
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
        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateImages`;
        requestBody = {
          prompt: finalPrompt,
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio
        };
      }

      const res = await withTimeout(
        fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(requestBody)
        }),
        AI_CALL_TIMEOUT_MS,
        'google-image'
      );
      const data = await safeParseResponse(res, 'Google Imagen API error');
      const base64 = data.generatedImages?.[0]?.image?.imageBytes || data.predictions?.[0]?.bytesBase64Encoded;
      imageUrl = base64 ? `data:image/jpeg;base64,${base64}` : '';
    }

    if (!imageUrl) throw new Error('Image generation returned empty result');

    // Save to physical disk and user_files DB to completely prevent WebSocket lag/freezes
    const { saveGeneratedImageToDisk } = await import('../files.js');
    const savedUrl = await saveGeneratedImageToDisk(String(userId), imageUrl);

    const estimatedCost = (route.cost_per_usage || 0) / 1000;
    if (estimatedCost > 0) {
      await pool.query(
        'UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
        [estimatedCost, providerId]
      );
    }

    await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `Image generated via ${route.primary_provider}/${route.primary_model}`, { toolIdStr, provider: providerId });

    const savedUrlWithAspect = `${savedUrl}#aspect=${selectedRatio}`;
    return { result: `![Generated Image](${savedUrlWithAspect})` };
  } catch (imgErr: any) {
    await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
    console.error('[Orchestrator Image] Generation failed:', imgErr.message);
    throw new Error(JSON.stringify({
      error: `Image generation failed: ${imgErr.message}`,
      error_ar: `فشل توليد الصورة: ${imgErr.message}`,
      type: "GENERATION_ERROR"
    }));
  }
}
