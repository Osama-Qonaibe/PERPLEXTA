import { pool } from '../../db/index.js';
import { getProviderKey } from '../ai.js';
import { getSystemSettings } from '../system.js';
import { logSystemActivity } from '../notifications.js';
import { saveGeneratedImageToDisk } from '../files.js';
import { io } from '../../config/socket.js';
import { 
  withTimeout, 
  safeParseResponse, 
  safeDecrementOnFailure, 
  validateProviderCapacity,
  IMG_TIMEOUT_MS,
  getNestedField
} from './utils.js';
import { GoogleGenAI } from "@google/genai";
import { getEconomySettings } from '../wallet.js';
import { getCachedGpuProviders } from '../gpuVaultService.js';
import { dispatchGpuTask } from '../gpu/gpuTaskDispatcher.js';

import type { TaskExecutionContext } from '../orchestratorRegistry.js';

function resolveImageDimensions(aspectRatio: string): { width: number; height: number } {
  if (aspectRatio === '16:9') {
    return { width: 1344, height: 768 };
  } else if (aspectRatio === '9:16') {
    return { width: 768, height: 1344 };
  } else if (aspectRatio === '21:9') {
    return { width: 1536, height: 640 };
  } else if (aspectRatio === '4:3') {
    return { width: 1152, height: 864 };
  } else if (aspectRatio === '3:4') {
    return { width: 864, height: 1152 };
  } else if (aspectRatio === '3:2') {
    return { width: 1152, height: 768 };
  } else if (aspectRatio === '2:3') {
    return { width: 768, height: 1152 };
  }
  return { width: 1024, height: 1024 };
}

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

  if (io) {
    io.to(`user_${userId}`).emit('image_progress', {
      progress: 10,
      status: 'analyzing',
      status_ar: 'تحليل المطلب الفني وتجهيز الأنماط العصبية الدقيقة...',
      status_en: 'Evaluating artistic prompt & aligning premium style maps...'
    });
  }

  // Auto-translate Arabic prompts to descriptive English using Gemini API
  const containsArabic = /[\u0600-\u06FF]/.test(finalPrompt);
  if (containsArabic && process.env.GEMINI_API_KEY) {
    if (io) {
      io.to(`user_${userId}`).emit('image_progress', {
        progress: 15,
        status: 'translating',
        status_ar: 'جاري ترجمة وتحسين المطلب الفني إلى الإنجليزية بدقة...',
        status_en: 'Translating and optimizing prompt to descriptive English...'
      });
    }
    try {
      const { GoogleGenAI } = await import('@google/genai');
      
      // Dynamically resolve translation model from orchestrator or vault
      let modelToUse = process.env.GEMINI_MODEL_ID;
      try {
        const { getCachedOrchestratorConfig } = await import('../../db/queries.js');
        const fastOrch = (await getCachedOrchestratorConfig('chat_fast')) || (await getCachedOrchestratorConfig('chat'));
        if (fastOrch?.primary_model) {
          modelToUse = fastOrch.primary_model;
        } else {
          const vaultRes = await pool.query("SELECT models FROM api_keys_vault WHERE provider IN ('google', 'gemini') AND is_active = true LIMIT 1");
          if (vaultRes.rows.length > 0) {
            const models = vaultRes.rows[0].models;
            if (Array.isArray(models) && models.length > 0) {
              const firstModel = models[0];
              modelToUse = typeof firstModel === 'string' ? firstModel : (firstModel.id || firstModel.name);
            }
          }
        }
        if (modelToUse && modelToUse.startsWith('models/')) modelToUse = modelToUse.substring(7);
      } catch (vaultErr) {
        console.warn('[Image Prompt Translator] Model lookup failed.');
      }

      if (!modelToUse) {
        throw new Error('No active Gemini/Google model found in vault for prompt translation.');
      }

      const aiObj = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY!,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      const translationResponse = await withTimeout(
        () => aiObj.models.generateContent({
          model: modelToUse,
          contents: `You are an expert prompt translator and optimizer. 
Translate the following Arabic image prompt into a highly descriptive, professional English prompt optimized for state-of-the-art image generation models (like Stable Diffusion XL, Midjourney, or Flux).
Focus on translating the exact core details, lighting, mood, colors, and subject accurately into descriptive English. Ensure the core subject remains intact (for example: if the user asks for scenery, nature, flowers, generate beautiful nature and do not add people or objects not requested).
Do not add conversational text, commentary, or introduction. Return ONLY the translated/enhanced English prompt.

Arabic Prompt: "${finalPrompt}"`,
          config: {
            maxOutputTokens: 250,
            temperature: 0.2
          }
        }),
        4500,
        'ImagePromptTranslation'
      );
      const resultText = translationResponse.text?.trim();
      if (resultText) {
        console.log(`[Image Prompt Translator] Translated: "${finalPrompt}" -> "${resultText}"`);
        finalPrompt = resultText;
      }
    } catch (err: any) {
      console.warn('[Image Prompt Translator] Failed to translate/optimize prompt:', err.message);
    }
  }

  const imageSettings = reqBody.image_settings || {};
  const selectedRatio = String(imageSettings.aspectRatio || '1:1');

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

  const vaultMap = new Map<string, any>();
  try {
    const { getCachedApiKeysVault } = await import('../../db/queries.js');
    const activeKeys = await getCachedApiKeysVault();
    if (activeKeys && activeKeys.length > 0) {
      for (const key of activeKeys) {
        if (key && key.provider) {
          vaultMap.set(key.provider.toLowerCase().replace(/\s+/g, ''), key);
        }
      }
    }
  } catch (err: any) {
    console.warn('[Image Task Pre-fetch] Failed to pre-load configuration keys:', err.message);
  }

  let promptPrefix = '';
  let promptSuffix = '';
  const selectedStyle = String(imageSettings.style || 'Cinematic').toLowerCase().trim();

  let promptPrefThreshold = 150;
  try {
    const systemSettings = await getSystemSettings();
    if (systemSettings && systemSettings.image_prompt_pref_threshold !== null && systemSettings.image_prompt_pref_threshold !== undefined) {
      promptPrefThreshold = Number(systemSettings.image_prompt_pref_threshold);
    }
  } catch (err: any) {
    console.warn('[Image Task] Failed to fetch prompt preference threshold from system_settings:', err.message);
  }

  const isCustomDetailedPrompt = finalPrompt.length > promptPrefThreshold;

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

  const available = 4000 - promptPrefix.length - promptSuffix.length;
  const trimmedCore = finalPrompt.substring(0, Math.max(200, available));
  finalPrompt = promptPrefix + trimmedCore + promptSuffix;

  let imageUrl = '';
  let successfulProvider = '';
  let successfulModel = '';

  if (io) {
    io.to(`user_${userId}`).emit('image_progress', {
      progress: 35,
      status: 'validating',
      status_ar: 'التحقق من جاهزية المحرك الفني وجدولة الطلب العصبوني...',
      status_en: 'Verifying image core availability & scheduling neural task...'
    });
  }

  for (const target of targets) {
    const providerId = target.provider.toLowerCase().replace(/\s+/g, '');
    const modelToUse = target.model || '';

    console.log(`[Image Orchestrator] Processing Route Pathway [${target.label}]: ${providerId} - ${modelToUse}`);

    // Intercept and route if target is a sovereign GPU Infrastructure node
    const gpuMap = await getCachedGpuProviders();
    const isGpuProvider = gpuMap.has(providerId) || Array.from(gpuMap.keys()).some(k => k.toLowerCase() === providerId);

    if (isGpuProvider) {
      console.log(`[Image Orchestrator] Routing target to Unified GpuTaskDispatcher: ${providerId} - ${modelToUse}`);
      try {
        const gpuRes = await dispatchGpuTask({
          userId,
          taskType: 'image_gen',
          prompt: finalPrompt,
          imageSettings,
          preferredProviderId: providerId,
          preferredModelId: modelToUse
        });
        if (gpuRes.mediaUrl) {
          imageUrl = gpuRes.mediaUrl;
          successfulProvider = gpuRes.providerId;
          successfulModel = gpuRes.modelId;
          break;
        }
      } catch (gpuErr: any) {
        console.warn(`[Image Orchestrator] GPU task dispatch failed for ${providerId}:`, gpuErr.message);
        continue;
      }
    }

    const vaultConfig = vaultMap.get(providerId);

    const validation = await validateProviderCapacity(
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

    if (io) {
      io.to(`user_${userId}`).emit('image_progress', {
        progress: 55,
        status: 'synthesizing',
        status_ar: `طلب ترخيص الإنشاء من المزود [${target.provider}] وتوليد مصفوفة البيكسلات...`,
        status_en: `Requesting synthesis authorization from Provider [${target.provider}] & launching pixel generation...`
      });
    }

    try {
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
          (aspectRatio === '16:9' || aspectRatio === '3:2' || aspectRatio === '4:3' || aspectRatio === '21:9') ? '1792x1024' :
          (aspectRatio === '9:16' || aspectRatio === '2:3' || aspectRatio === '3:4') ? '1024x1792' :
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
              const progressPct = Math.min(95, 55 + Math.round((i / 40) * 40));
              if (io) {
                io.to(`user_${userId}`).emit('image_progress', {
                  progress: progressPct,
                  status: 'processing',
                  status_ar: `توليد ترصيع البيكسلات من Replicate... ${progressPct}%`,
                  status_en: `Synthesizing pixel rendering from Replicate... ${progressPct}%`
                });
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
        let geminiRatio = aspectRatio;
        if (aspectRatio === '3:2') geminiRatio = '16:9';
        else if (aspectRatio === '2:3') geminiRatio = '9:16';
        else if (aspectRatio === '21:9') geminiRatio = '16:9';
        let cleanModel = modelToUse || '';
        
        if (!cleanModel || cleanModel === 'default') {
          throw new Error('Image Orchestrator: Google/Gemini model is not configured in the Admin Panel.');
        }

        if (cleanModel.startsWith('models/')) {
          cleanModel = cleanModel.substring(7);
        }

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
              aspectRatio: geminiRatio as any
            }
          }),
          IMG_TIMEOUT_MS,
          'google-image'
        );

        const base64Bytes = imageResponse.generatedImages?.[0]?.image?.imageBytes;
        imageUrl = base64Bytes ? `data:image/jpeg;base64,${base64Bytes}` : '';
      } else {
        let rawEndpoint = (vaultConfig?.url_key || '').trim().replace(/\/+$/, '');
        if (rawEndpoint) {
          if (rawEndpoint.endsWith('/images/generations')) {
            // Already fully qualified
          } else if (rawEndpoint.endsWith('/v1')) {
            rawEndpoint = `${rawEndpoint}/images/generations`;
          } else {
            try {
              const urlInstance = new URL(rawEndpoint);
              const pathName = urlInstance.pathname.replace(/\/+$/, '');
              if (pathName === '' || pathName === '/') {
                rawEndpoint = `${rawEndpoint}/v1/images/generations`;
              } else if (pathName.endsWith('/v1') || pathName.includes('/v1/')) {
                rawEndpoint = `${rawEndpoint}/images/generations`;
              } else {
                // Support generic custom paths by appending standard suffix for compatibility
                rawEndpoint = `${rawEndpoint}/images/generations`;
              }
            } catch (e) {
              rawEndpoint = `${rawEndpoint}/v1/images/generations`;
            }
          }
        }
        const finalEndpoint = rawEndpoint;

        if (!finalEndpoint) {
          throw new Error(`Orchestration routing check: Dynamic provider '${target.provider}' has unsupported providerId '${providerId}' and is missing a registered custom endpoint URL (url_key) in the vault.`);
        }

        console.log(`[Image Task] Executing generic/custom endpoint generation for provider: ${providerId} on endpoint: ${finalEndpoint}`);

        const { width, height } = resolveImageDimensions(imageSettings.aspectRatio || '1:1');

        const protocolConfig = vaultConfig?.protocol_config || {};
        const omitDimensions = protocolConfig.omit_dimensions ?? true;
        const omitResponseFormat = protocolConfig.omit_response_format ?? true;

        const requestBody: any = {
          model: modelToUse,
          prompt: finalPrompt,
          n: 1,
          size: `${width}x${height}`
        };

        if (!omitDimensions) {
          requestBody.width = width;
          requestBody.height = height;
        }
        if (!omitResponseFormat) {
          requestBody.response_format = protocolConfig.response_format || 'url';
        }

        if (protocolConfig.extra_body && typeof protocolConfig.extra_body === 'object') {
          Object.assign(requestBody, protocolConfig.extra_body);
        }

        const res = await withTimeout(
          (signal) => fetch(finalEndpoint, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${apiKey}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify(requestBody),
            signal
          }),
          IMG_TIMEOUT_MS,
          'generic-image-generation'
        );

        const resData = await safeParseResponse(res, `Dynamic API response status from ${target.provider}`);
        
        const rawValue = 
          resData?.data?.[0]?.url || 
          resData?.data?.[0]?.b64_json ||
          resData?.url || 
          resData?.image_url ||
          resData?.image ||
          (Array.isArray(resData?.output) ? resData.output[0] : resData?.output);

        const genericUrl = typeof rawValue === 'string' ? rawValue : '';

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
        try {
          const diskSavedUrl = await saveGeneratedImageToDisk(String(userId), imageUrl);
          imageUrl = diskSavedUrl;
          successfulProvider = providerId;
          successfulModel = modelToUse;
          console.log(`[Image Orchestrator] Target [${target.label}] (${providerId}) generated and validated on disk as ${diskSavedUrl}!`);
          break;
        } catch (saveErr: any) {
          console.warn(`[Image Orchestrator] Target [${target.label}] (${providerId}) image payload validation/disk save failed: ${saveErr.message}. Transitioning to next provider...`);
          imageUrl = '';
        }
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

  if (io) {
    io.to(`user_${userId}`).emit('image_progress', {
      progress: 100,
      status: 'completed',
      status_ar: 'اكتمل توليد الصورة فائقة الدقة بنجاح!',
      status_en: 'Premium image synthesized and refined successfully!'
    });
  }

  let savedUrl = imageUrl;

  try {
    const settings = await getEconomySettings();
    const pointsPerDollar = parseFloat(settings.points_per_dollar || '1000');
    const estimatedCost = (route.cost_per_usage || 0) / pointsPerDollar;
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
