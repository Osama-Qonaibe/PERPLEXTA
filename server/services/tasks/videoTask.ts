import { pool } from '../../db/index.js';
import { getProviderKey } from '../ai.js';
import { logSystemActivity } from '../notifications.js';
import { io } from '../../config/socket.js';
import { saveGeneratedVideoToDisk } from '../files.js';
import { VideoResourceProvider } from '../videoResourceProvider.js';
import { 
  withTimeout, 
  safeParseResponse, 
  safeDecrementOnFailure,
  validateProviderCapacity,
  AI_CALL_TIMEOUT_MS,
  VIDEO_TIMEOUT_MS
} from './utils.js';
import { GoogleGenAI } from "@google/genai";
import type { TaskExecutionContext } from '../orchestratorRegistry.js';

const RUNWAY_API_VERSION = '2024-11-06';

/**
 * Executes a POST request to generic or dynamic video generation API endpoints.
 */
async function sendGenericVideoRequest(
  endpoint: string,
  apiKey: string,
  payload: {
    model: string;
    prompt: string;
    duration: number;
    aspect_ratio: string;
    resolution: string;
    style: string;
  },
  timeoutName: string,
  providerLabel: string
): Promise<string> {
  const response = await withTimeout(
    (signal) => fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal
    }),
    AI_CALL_TIMEOUT_MS,
    timeoutName
  );

  const resData = await safeParseResponse(response, `Dynamic API response status from ${providerLabel}`);
  const vUrl = resData?.video_url || resData?.data?.[0]?.url || resData?.url || resData?.output || '';

  if (!vUrl) {
    throw new Error(`Dynamic endpoint on provider '${providerLabel}' did not return a valid video field.`);
  }
  return vUrl;
}

export async function executeVideoTask(ctx: TaskExecutionContext): Promise<{ result: string }> {
  const { reqBody, userId, route } = ctx;
  const { finalPrompt } = ctx;
  const toolIdStr = 'video';
  const video_settings = reqBody.video_settings;

  let requestedDuration = video_settings ? parseInt(String(video_settings.duration)) : 5;
  if (isNaN(requestedDuration) || requestedDuration <= 0) {
    requestedDuration = 5;
  }
  const fps = video_settings?.fps || 24; // UI-only indicator (estimated display metrics for progress)
  const totalFrames = requestedDuration * fps; // UI-only indicator (estimated display metrics for progress)

  // Build the fallback chain routing targets array
  const targets = [
    { provider: route.primary_provider, model: route.primary_model, label: 'primary' },
    { provider: route.fallback_1_provider, model: route.fallback_1_model, label: 'fallback_1' },
    { provider: route.fallback_2_provider, model: route.fallback_2_model, label: 'fallback_2' },
    { provider: route.fallback_3_provider, model: route.fallback_3_model, label: 'fallback_3' }
  ].filter(t => t.provider && t.model);

  // Pre-load all candidate provider settings from database in one consolidated query
  const vaultMap = new Map<string, any>();
  if (targets.length > 0) {
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
      console.warn('[Video Task Pre-fetch] Failed to pre-load configuration keys:', err.message);
    }
  }

  // Construct actual prompt with visual styles
  let actualPrompt = finalPrompt;
  if (video_settings?.style && video_settings.style !== 'Cinematic') {
    actualPrompt = `${finalPrompt}, styled in ${video_settings.style} aesthetic`;
  } else if (video_settings?.style) {
    actualPrompt = `${finalPrompt}, high-fidelity cinematic styling`;
  }

  let videoUrl = '';
  let successfulProvider = '';
  let successfulModel = '';
  let successfulApiKey = '';

  try {
    // Wrap entire target traversal list with VIDEO_GENERATION_TIMEOUT_MS limit (C-1)
    await withTimeout(
      async (outerSignal) => {
        for (const target of targets) {
          const providerId = target.provider.toLowerCase().replace(/\s+/g, '');
          const modelName = target.model || '';

          console.log(`[Video Orchestrator] Trying Target Path [${target.label}]: ${providerId} - ${modelName}`);

          const vaultConfig = vaultMap.get(providerId);

          // Perform capacity security checks
          const validation = validateProviderCapacity(
            vaultConfig,
            providerId,
            route.cost_per_usage || 0
          );

          if (!validation.valid) {
            console.warn(`[Video Orchestrator Check] Skipping ${providerId} because: ${validation.warning}`);
            continue;
          }

          const apiKey = await getProviderKey(providerId);
          if (!apiKey) {
            console.warn(`[Video Orchestrator Check] API key is missing for provider ${providerId}. Skipping.`);
            continue;
          }

          // Emit initial routing step
          if (io) {
            io.to(`user_${userId}`).emit('video_progress', {
              progress: 10,
              renderedFrames: Math.round(totalFrames * 0.10),
              totalFrames,
              phase: `Connecting to ${target.provider} and scheduling video generation...`,
              phase_ar: `الاتصال بـ ${target.provider} وجدولة تسلسل توليف الفيديو...`,
              fps: 0,
              currentStep: 1,
              totalSteps: 120
            });
          }

          try {
            const customUrl = vaultConfig?.url_key;

            if (customUrl) {
              console.log(`[Video Task] Routing to custom URL endpoint for '${providerId}': ${customUrl}`);
              
              if (io) {
                io.to(`user_${userId}`).emit('video_progress', {
                  progress: 25,
                  renderedFrames: Math.round(totalFrames * 0.25),
                  totalFrames,
                  phase: `Initiating connection request with dynamic custom endpoint on ${target.provider}...`,
                  phase_ar: `بدء إرسال طلب التوليد للواجهة البرمجية المخصصة التابعة لـ ${target.provider}...`,
                  fps: 0,
                  currentStep: 3,
                  totalSteps: 120
                });
              }

              videoUrl = await sendGenericVideoRequest(
                customUrl,
                apiKey,
                {
                  model: modelName,
                  prompt: actualPrompt,
                  duration: requestedDuration,
                  aspect_ratio: video_settings?.aspectRatio || "16:9",
                  resolution: video_settings?.resolution || "1080p",
                  style: video_settings?.style || "Cinematic"
                },
                'generic-custom-video-generation',
                target.provider
              );
            } else if (providerId === 'replicate') {
              const inputPayload: any = {
                prompt: actualPrompt
              };
              if (video_settings?.aspectRatio) {
                inputPayload.aspect_ratio = video_settings.aspectRatio;
                inputPayload.aspectRatio = video_settings.aspectRatio;
              }
              if (video_settings?.duration) {
                inputPayload.duration = requestedDuration;
                inputPayload.length = requestedDuration;
              }
              if (video_settings?.style && video_settings.style !== 'Cinematic') {
                inputPayload.style = video_settings.style;
              }

              const res = await withTimeout(
                (signal) => fetch('https://api.replicate.com/v1/predictions', {
                  method: 'POST',
                  headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ version: modelName, input: inputPayload }),
                  signal
                }),
                AI_CALL_TIMEOUT_MS,
                'replicate-video-init'
              );
              const prediction = await safeParseResponse(res, 'Replicate video error');
              const pollUrl = prediction.urls?.get;
              
              if (pollUrl) {
                const totalSteps = 70;
                for (let i = 0; i < totalSteps; i++) {
                  const progressPct = Math.min(98, Math.round(15 + (i / totalSteps) * 80));
                  const renderedFrames = Math.round((progressPct / 100) * totalFrames);
                  
                  if (io) {
                    io.to(`user_${userId}`).emit('video_progress', {
                      progress: progressPct,
                      renderedFrames,
                      totalFrames,
                      phase: `Processing video frames on Replicate (${progressPct}%) [Step ${i + 1}/${totalSteps}]`,
                      phase_ar: `توليد ومعالجة إطارات الفيديو على Replicate (${progressPct}%) [الخطوة ${i + 1}/${totalSteps}]`,
                      fps,
                      currentStep: i + 1,
                      totalSteps
                    });
                  }

                  if (outerSignal?.aborted) {
                    throw new Error('Replicate video generation polling aborted due to timeout.');
                  }
                  await new Promise(r => setTimeout(r, 5000));
                  const poll = await fetch(pollUrl, { 
                    headers: { 'Authorization': `Token ${apiKey}` },
                    signal: outerSignal
                  });
                  const pollData = await safeParseResponse(poll, 'Replicate video poll error');
                  if (pollData.status === 'succeeded') {
                    videoUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
                    break;
                  }
                  if (pollData.status === 'failed') {
                    throw new Error('Replicate video task failed at runtime.');
                  }
                }

                if (!videoUrl) {
                  throw new Error(`replicate polling timed out after ${totalSteps * 5}s without result.`);
                }
              }
            } else if (providerId === 'runway') {
              let calculatedRatio = '1280:768';
              if (video_settings?.aspectRatio === '9:16') {
                calculatedRatio = '768:1280';
              } else if (video_settings?.aspectRatio === '1:1') {
                calculatedRatio = '768:768';
              }

              const res = await withTimeout(
                (signal) => fetch('https://api.runwayml.com/v1/text_to_video', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Runway-Version': RUNWAY_API_VERSION
                  },
                  body: JSON.stringify({
                    model: modelName,
                    promptText: actualPrompt,
                    duration: requestedDuration,
                    ratio: calculatedRatio
                  }),
                  signal
                }),
                AI_CALL_TIMEOUT_MS,
                'runway-video-init'
              );
              const task = await safeParseResponse(res, 'Runway error');
              const taskId = task.id;

              if (taskId) {
                const totalSteps = 70;
                for (let i = 0; i < totalSteps; i++) {
                  const progressPct = Math.min(98, Math.round(15 + (i / totalSteps) * 80));
                  const renderedFrames = Math.round((progressPct / 100) * totalFrames);

                  if (io) {
                    io.to(`user_${userId}`).emit('video_progress', {
                      progress: progressPct,
                      renderedFrames,
                      totalFrames,
                      phase: `RunwayML pending generation process (${progressPct}%) [Step ${i + 1}/${totalSteps}]`,
                      phase_ar: `معالجة توليد مقطع الفيديو على RunwayML بقسم (${progressPct}%) [الخطوة ${i + 1}/${totalSteps}]`,
                      fps,
                      currentStep: i + 1,
                      totalSteps
                    });
                  }

                  if (outerSignal?.aborted) {
                    throw new Error('Runway video generation polling aborted due to timeout.');
                  }
                  await new Promise(r => setTimeout(r, 5000));
                  const poll = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Runway-Version': RUNWAY_API_VERSION },
                    signal: outerSignal
                  });
                  const pollData = await safeParseResponse(poll, 'Runway video poll error');
                  if (pollData.status === 'SUCCEEDED') {
                    videoUrl = pollData.output?.[0] || '';
                    break;
                  }
                  if (pollData.status === 'FAILED') {
                    throw new Error(`Runway task execution failed: ${pollData.failureReason || 'unknown'}`);
                  }
                }

                if (!videoUrl) {
                  throw new Error(`runway polling timed out after ${totalSteps * 5}s without result.`);
                }
              }
            } else if (providerId === 'google' || providerId === 'gemini' || providerId.includes('veo')) {
              const cleanModel = modelName.startsWith('models/') ? modelName.substring(7) : modelName;
              if (!cleanModel) {
                throw new Error(`Google Veo: no model configured in orchestrator settings.`);
              }
              const modelToUse = cleanModel;

              const SUPPORTED_VEO_MODELS = ['veo-2.0-generate-001', 'veo-3.0-generate-preview'];
              if (!SUPPORTED_VEO_MODELS.includes(modelToUse)) {
                throw new Error(`Unsupported Veo model: '${modelToUse}'.`);
              }

              if (io) {
                io.to(`user_${userId}`).emit('video_progress', {
                  progress: 20,
                  renderedFrames: Math.round(totalFrames * 0.20),
                  totalFrames,
                  phase: 'Initializing Google Veo request and allocation check...',
                  phase_ar: 'تهيئة طلب خدمة Google Veo والتحقق من الحصة المتاحة...',
                  fps: 0,
                  currentStep: 2,
                  totalSteps: 120
                });
              }

              const ai = new GoogleGenAI({
                apiKey: apiKey,
                httpOptions: {
                  headers: {
                    'User-Agent': 'aistudio-build',
                  }
                }
              });

              const operation = await ai.models.generateVideos({
                model: modelToUse,
                prompt: actualPrompt,
                config: {
                  numberOfVideos: 1,
                  resolution: video_settings?.resolution || '1080p',
                  aspectRatio: video_settings?.aspectRatio || '16:9'
                }
              });

              if (!operation || !operation.name) {
                throw new Error(`Google Veo request did not return a valid long-running operation.`);
              }
              
              let completedOp = null;
              const totalSteps = 70;
              for (let i = 0; i < totalSteps; i++) {
                if (outerSignal?.aborted) {
                  throw new Error('Google Veo video generation aborted due to timeout.');
                }
                const progressPct = Math.min(98, Math.round(15 + (i / totalSteps) * 80));
                const renderedFrames = Math.round((progressPct / 100) * totalFrames);
                
                if (io) {
                  io.to(`user_${userId}`).emit('video_progress', {
                    progress: progressPct,
                    renderedFrames,
                    totalFrames,
                    phase: `Google Veo video generation in progress (${progressPct}%)`,
                    phase_ar: `عملية توليد الفيديو على Google Veo مستمرة بقسم (${progressPct}%)`,
                    fps,
                    currentStep: i + 1,
                    totalSteps
                  });
                }

                await new Promise(r => setTimeout(r, 5000));
                const updated = await ai.operations.getVideosOperation({ operation: { name: operation.name } as any });
                if (updated.done) {
                  completedOp = updated;
                  break;
                }
              }

              if (!completedOp || !completedOp.done) {
                throw new Error('Google Veo video generation timed out after maximum polling limits.');
              }

              const uri = completedOp.response?.generatedVideos?.[0]?.video?.uri;
              if (!uri) {
                throw new Error('Google Veo operation completed but did not return a valid video URI.');
              }

              videoUrl = uri;
            } else {
              const finalEndpoint = vaultConfig?.url_key;
              if (!finalEndpoint) {
                throw new Error(`Orchestration routing check: Dynamic provider '${target.provider}' is missing a registered custom endpoint URL (url_key) in the vault.`);
              }
              
              console.log(`[Video Task] Executing generic endpoint generation for provider: ${providerId} on endpoint: ${finalEndpoint}`);
              
              if (io) {
                io.to(`user_${userId}`).emit('video_progress', {
                  progress: 25,
                  renderedFrames: Math.round(totalFrames * 0.25),
                  totalFrames,
                  phase: `Initiating connection request with dynamic endpoint on ${target.provider}...`,
                  phase_ar: `بدء إرسال طلب التوليد للواجهة البرمجية التابعة لـ ${target.provider}...`,
                  fps: 0,
                  currentStep: 3,
                  totalSteps: 120
                });
              }

              videoUrl = await sendGenericVideoRequest(
                finalEndpoint,
                apiKey,
                {
                  model: modelName,
                  prompt: actualPrompt,
                  duration: requestedDuration,
                  aspect_ratio: video_settings?.aspectRatio || "16:9",
                  resolution: video_settings?.resolution || "1080p",
                  style: video_settings?.style || "Cinematic"
                },
                'generic-video-generation',
                target.provider
              );
            }

            if (videoUrl) {
              successfulProvider = providerId;
              successfulModel = modelName;
              successfulApiKey = apiKey;
              console.log(`[Video Orchestrator] Target [${target.label}] (${providerId}) generated successfully!`);
              break;
            }
          } catch (err: any) {
            const cleanMessage = err.message || '';
            console.warn(`[Video Orchestrator] Target [${target.label}] (${providerId}) failed with error:`, err);
            
            await logSystemActivity(userId, 'VIDEO_DYNAMIC_TRANSITION', `Target '${target.label}' is being transitionally routed. Shifting...`, {
              assignedProvider: providerId,
              assignedModel: modelName,
              statusMessage: cleanMessage
            });
          }
        }
      },
      VIDEO_TIMEOUT_MS,
      'video-generation-loop'
    );

    // If no video URL was generated after trying all targets
    if (!videoUrl) {
      throw new Error('All configured video generation providers failed or returned empty results.');
    }

    // Emit final progress milestone
    if (io) {
      io.to(`user_${userId}`).emit('video_progress', {
        progress: 100,
        renderedFrames: totalFrames,
        totalFrames,
        phase: "Composed! Syncing media bytes...",
        phase_ar: "اكتمل توليد الفيديو بنجاح. جاري مزامنة وحفظ ملف الوسائط المولد...",
        fps,
        currentStep: 120,
        totalSteps: 120
      });
    }

    const estimatedCost = (route.cost_per_usage || 0) / 1000;
    if (estimatedCost > 0 && successfulProvider) {
      await pool.query(
        'UPDATE api_keys_vault SET used_today = used_today + $1, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
        [estimatedCost, successfulProvider]
      );
    }

    await logSystemActivity(userId, 'PERPLEXTA_EXECUTION', `Video generation completed successfully`, { 
      toolIdStr, 
      provider: successfulProvider,
      modelUsed: successfulModel
    });

    let savedLocalUrl = videoUrl;
    try {
      if (videoUrl && !videoUrl.startsWith('/uploads/')) {
        console.log(`[Video Storage] Registering and saving video locally to disk/ledger for user ${userId}...`);
        const customHeaders: Record<string, string> = {};
        if (successfulProvider === 'google' || successfulProvider === 'gemini' || successfulProvider.includes('veo')) {
          customHeaders['x-goog-api-key'] = successfulApiKey;
        }
        savedLocalUrl = await saveGeneratedVideoToDisk(String(userId), videoUrl, customHeaders);
      }
    } catch (saveErr: any) {
      console.warn('[Video Task] Silent warning: failed to save video locally, fallback to original URL.', saveErr.message);
    }

    // Save to video_resources database
    try {
      if (savedLocalUrl) {
        await VideoResourceProvider.storeVideoResource(
          String(userId),
          reqBody.chat_id ? parseInt(String(reqBody.chat_id)) : null,
          null,
          savedLocalUrl,
          finalPrompt,
          successfulProvider || 'Backup',
          successfulModel || 'Fallback',
          requestedDuration,
          video_settings?.aspectRatio || '16:9',
          video_settings?.resolution || '1080p',
          { original_url: videoUrl, generated_at: new Date() }
        );
      }
    } catch (dbErr: any) {
      console.log('[Video Task] Database registry status update:', dbErr.message);
    }

    const finalUrl = video_settings
      ? `${savedLocalUrl}#aspect=${video_settings.aspectRatio || '16:9'}&resolution=${video_settings.resolution || '1080p'}&duration=${video_settings.duration || '5'}`
      : savedLocalUrl;

    return { result: `[Generated Video](${finalUrl})` };
  } catch (videoErr: any) {
    console.error('[Orchestrator Video] Critical video task execution failure:', videoErr.message);
    
    await safeDecrementOnFailure(ctx.quotaCheck, userId, 'video', ctx.walletCharged);
    
    throw new Error(JSON.stringify({
      error: `Video generation task failed: ${videoErr.message || 'The request timed out or was rejected by the provider.'}`,
      error_ar: `فشل خط توليد الفيديو: ${videoErr.message || 'انتهت مهلة المخدم أو تم رفض الطلب من مزود الخدمة.'}`,
      type: "GENERATION_ERROR"
    }));
  }
}
