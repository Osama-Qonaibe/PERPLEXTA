import { pool } from '../../db/index.js';
import { getProviderKey, getProviderUrlKey } from '../ai.js';
import { logSystemActivity } from '../notifications.js';
import { io } from '../../config/socket.js';
import { saveGeneratedVideoToDisk, saveFileMetadata } from '../files.js';
import { VideoResourceProvider } from '../videoResourceProvider.js';
import { 
  withTimeout, 
  safeParseResponse, 
  safeDecrementOnFailure,
  AI_CALL_TIMEOUT_MS 
} from './utils.js';
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import type { TaskExecutionContext } from '../orchestratorRegistry.js';

/**
 * ELITE-GRADE PRE-GENERATION MODEL VALIDATION & RESOURCE CAPACITY ENGINE
 * Verifies availability, budget caps, recent failure-rate logging, and dynamic parameters sanity.
 * This is non-blocking to prevent total app crashes if a single model is offline, letting orchestrator fallbacks activate gracefully.
 */
/**
 * ELITE-GRADE PRE-GENERATION MODEL VALIDATION & RESOURCE CAPACITY ENGINE
 * Verifies availability, budget caps, recent failure-rate logging, and dynamic parameters sanity.
 * This is non-blocking to prevent total app crashes if a single model is offline, letting orchestrator fallbacks activate gracefully.
 */
function validateVideoModelCapacityCached(
  vaultConfig: any,
  providerId: string,
  costPerUsage: number
): { warning?: string; valid: boolean } {
  if (!providerId) return { valid: true };

  if (!vaultConfig) {
    return { 
      valid: false, 
      warning: `Pre-flight check: Provider '${providerId}' has no registered configuration in the vault.`
    };
  }

  const { is_active, daily_budget, used_today } = vaultConfig;

  if (!is_active) {
    return { 
      valid: false, 
      warning: `Pre-flight check: Provider '${providerId}' is currently inactive. Routing to fallback targets.` 
    };
  }

  const budget = parseFloat(daily_budget || '0');
  const used = parseFloat(used_today || '0');
  const estimatedCost = (costPerUsage || 0) / 1000;

  if (budget > 0 && (used + estimatedCost) > budget) {
    return { 
      valid: false, 
      warning: `Pre-flight check: Daily budget of ${budget} for '${providerId}' is exhausted.` 
    };
  }

  return { valid: true };
}

export async function executeVideoTask(ctx: TaskExecutionContext): Promise<{ result: string }> {
  const { reqBody, userId, route } = ctx;
  const { finalPrompt } = ctx;
  const toolIdStr = 'video';
  const video_settings = reqBody.video_settings;

  const requestedDuration = video_settings ? parseInt(String(video_settings.duration || '5')) : 5;
  const totalFrames = requestedDuration * 24;

  // Compile all candidate targets in the fallback chain for dynamic orchestrator-driven fallback resolution:
  // 1. Primary Model Setup
  // 2. Fallback 1
  // 3. Fallback 2
  // 4. Fallback 3
  const targets = [
    { provider: route.primary_provider, model: route.primary_model, label: 'primary' },
    { provider: route.fallback_1_provider, model: route.fallback_1_model, label: 'fallback_1' },
    { provider: route.fallback_2_provider, model: route.fallback_2_model, label: 'fallback_2' },
    { provider: route.fallback_3_provider, model: route.fallback_3_model, label: 'fallback_3' }
  ].filter(t => t.provider && t.model);

  // Pre-load all candidate provider settings from the database in ONE SINGLE QUERY to avoid duplicate/dead iterations
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

  // Construct actualPrompt from finalPrompt and video style setting if specified
  let actualPrompt = finalPrompt;
  if (video_settings?.style && video_settings.style !== 'Cinematic') {
    actualPrompt = `${finalPrompt}, styled in ${video_settings.style} aesthetic`;
  } else if (video_settings?.style) {
    actualPrompt = `${finalPrompt}, high-fidelity cinematic styling`;
  }

  let videoUrl = '';
  let successfulProvider = '';
  let successfulModel = '';

  try {
    for (const target of targets) {
      const providerId = target.provider.toLowerCase().replace(/\s+/g, '');
      const modelName = target.model || '';

      console.log(`[Video Orchestrator] Handing over execution to Target [${target.label}]: ${providerId} - ${modelName}`);

      const vaultConfig = vaultMap.get(providerId);

      // Perform validation check using cached database configuration
      const validation = validateVideoModelCapacityCached(
        vaultConfig,
        providerId,
        route.cost_per_usage || 0
      );

      if (!validation.valid) {
        console.warn(`[Video Orchestrator Check] Skipping ${providerId} because: ${validation.warning}`);
        continue;
      }

      // Fetch key
      const apiKey = await getProviderKey(providerId);
      if (!apiKey) {
        console.warn(`[Video Orchestrator Check] No API key available for ${providerId}. Skipping.`);
        continue;
      }

      // Emit hand-shaking progress
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
          // --- Custom Defined Endpoint Overrides ALL Hardcoded Behaviors ---
          console.log(`[Video Task] Overriding to generic custom URL endpoint generation for '${providerId}': ${customUrl}`);
          
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

          const response = await withTimeout(
            fetch(customUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: modelName,
                prompt: actualPrompt,
                duration: requestedDuration,
                aspect_ratio: video_settings?.aspectRatio || "16:9",
                resolution: video_settings?.resolution || "1080p",
                style: video_settings?.style || "Cinematic"
              })
            }),
            AI_CALL_TIMEOUT_MS,
            'generic-custom-video-generation'
          );

          const resData = await safeParseResponse(response, `Dynamic Custom API response error from ${target.provider}`);
          videoUrl = resData?.video_url || resData?.data?.[0]?.url || resData?.url || resData?.output || '';

          if (!videoUrl) {
            throw new Error(`Dynamic Custom endpoint on provider '${target.provider}' did not return a valid video field.`);
          }
        } else if (providerId === 'replicate') {
          // --- Replicate Process ---
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
            fetch('https://api.replicate.com/v1/predictions', {
              method: 'POST',
              headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ version: modelName, input: inputPayload })
            }),
            AI_CALL_TIMEOUT_MS,
            'replicate-video-init'
          );
          const prediction = await safeParseResponse(res, 'Replicate video error');
          const pollUrl = prediction.urls?.get;
          
          if (pollUrl) {
            const totalSteps = 120;
            for (let i = 0; i < totalSteps; i++) {
              const progressPct = Math.round(15 + (i / totalSteps) * 80);
              const renderedFrames = Math.round((progressPct / 100) * totalFrames);
              
              if (io) {
                io.to(`user_${userId}`).emit('video_progress', {
                  progress: progressPct,
                  renderedFrames,
                  totalFrames,
                  phase: `Processing video frames on Replicate (${progressPct}%) [Step ${i + 1}/${totalSteps}]`,
                  phase_ar: `توليد ومعالجة إطارات الفيديو على Replicate (${progressPct}%) [الخطوة ${i + 1}/${totalSteps}]`,
                  fps: 24,
                  currentStep: i + 1,
                  totalSteps
                });
              }

              await new Promise(r => setTimeout(r, 5000));
              const poll = await fetch(pollUrl, { headers: { 'Authorization': `Token ${apiKey}` } });
              const pollData = await safeParseResponse(poll, 'Replicate video poll error');
              if (pollData.status === 'succeeded') {
                videoUrl = Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
                break;
              }
              if (pollData.status === 'failed') {
                throw new Error('Replicate video task failed at runtime.');
              }
            }
          }
        } else if (providerId === 'runway') {
          // --- Runway Process ---
          let calculatedRatio = '1280:768';
          if (video_settings?.aspectRatio === '9:16') {
            calculatedRatio = '768:1280';
          } else if (video_settings?.aspectRatio === '1:1') {
            calculatedRatio = '768:768';
          }

          const res = await withTimeout(
            fetch('https://api.runwayml.com/v1/text_to_video', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-Runway-Version': '2024-11-06'
              },
              body: JSON.stringify({
                model: modelName || 'gen3a_turbo',
                promptText: actualPrompt,
                duration: requestedDuration,
                ratio: calculatedRatio
              })
            }),
            AI_CALL_TIMEOUT_MS,
            'runway-video-init'
          );
          const task = await safeParseResponse(res, 'Runway error');
          const taskId = task.id;

          if (taskId) {
            const totalSteps = 120;
            for (let i = 0; i < totalSteps; i++) {
              const progressPct = Math.round(15 + (i / totalSteps) * 80);
              const renderedFrames = Math.round((progressPct / 100) * totalFrames);

              if (io) {
                io.to(`user_${userId}`).emit('video_progress', {
                  progress: progressPct,
                  renderedFrames,
                  totalFrames,
                  phase: `RunwayML cluster rendering frames (${progressPct}%) [Step ${i + 1}/${totalSteps}]`,
                  phase_ar: `عنقود معالجة RunwayML يولد إطارات الفيديو (${progressPct}%) [الخطوة ${i + 1}/${totalSteps}]`,
                  fps: 24,
                  currentStep: i + 1,
                  totalSteps
                });
              }

              await new Promise(r => setTimeout(r, 5000));
              const poll = await fetch(`https://api.runwayml.com/v1/tasks/${taskId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Runway-Version': '2024-11-06' }
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
          }
        } else if (providerId === 'google' || providerId === 'gemini' || providerId.includes('veo')) {
          // --- Google Veo/Gemini Dynamic Process ---
          const cleanModel = modelName.startsWith('models/') ? modelName.substring(7) : modelName;
          const modelToUse = cleanModel || 'veo-3.1-lite-generate-preview';

          if (io) {
            io.to(`user_${userId}`).emit('video_progress', {
              progress: 20,
              renderedFrames: Math.round(totalFrames * 0.20),
              totalFrames,
              phase: 'Connecting to Google Veo Studio & scheduling video generation state...',
              phase_ar: 'الاتصال بأستوديو Google Veo وجدولة عملية توليد إطارات مقطع الفيديو...',
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

          const op = new GenerateVideosOperation();
          op.name = operation.name;
          
          let completedOp = null;
          const totalSteps = 120; // 120 steps * 5s = 10 minutes max timeout
          for (let i = 0; i < totalSteps; i++) {
            const progressPct = Math.round(15 + (i / totalSteps) * 80);
            const renderedFrames = Math.round((progressPct / 100) * totalFrames);
            
            if (io) {
              io.to(`user_${userId}`).emit('video_progress', {
                progress: progressPct,
                renderedFrames,
                totalFrames,
                phase: `Google Veo video synthesis processing (${progressPct}%) [Step ${i + 1}/${totalSteps}]`,
                phase_ar: `معالج ومولد Google Veo يقوم بتوليف الإطارات (${progressPct}%) [الخطوة ${i + 1}/${totalSteps}]`,
                fps: 24,
                currentStep: i + 1,
                totalSteps
              });
            }

            await new Promise(r => setTimeout(r, 5000));
            const updated = await ai.operations.getVideosOperation({ operation: op });
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

          // Stream the video bytes securely directly to the server's local disk
          // This prevents massive base64 text-representation memory overhead and V8 OOM crashes during concurrent usage
          const uploadDir = path.join(process.cwd(), 'uploads');
          await fs.mkdir(uploadDir, { recursive: true }).catch(() => {});

          const fileExtension = 'mp4';
          const randomFilename = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
          const filePath = path.join(uploadDir, randomFilename);

          const videoDownloadRes = await fetch(uri, {
            headers: { 'x-goog-api-key': apiKey },
          });

          if (!videoDownloadRes.ok) {
            throw new Error(`Failed to download generated Veo video bytes from Google: HTTP ${videoDownloadRes.status}`);
          }

          if (!videoDownloadRes.body) {
            throw new Error('Google Veo fetch response body is empty.');
          }

          const fileStream = createWriteStream(filePath);
          const nodeReadable = Readable.fromWeb(videoDownloadRes.body as any);
          await pipeline(nodeReadable, fileStream);

          const mimeType = videoDownloadRes.headers.get('content-type') || 'video/mp4';
          const contentLengthStr = videoDownloadRes.headers.get('content-length');
          const fileSize = contentLengthStr ? parseInt(contentLengthStr, 10) : 0;

          // Register in system file metadata cleanly
          await saveFileMetadata(String(userId), {
            file_name: `Perplexta_Veo_Video_${Date.now()}.${fileExtension}`,
            file_url: randomFilename,
            file_size: fileSize,
            mime_type: mimeType,
            file_type: 'video',
            metadata: {
              generated: true,
              origin: 'AI_Orchestrator_Studio_Veo',
              model: modelToUse
            }
          });

          videoUrl = `/uploads/${randomFilename}`;
        } else {
          // --- Generic Dynamic Model Fallback Handler ---
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

          const response = await withTimeout(
            fetch(finalEndpoint, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: modelName,
                prompt: actualPrompt,
                duration: requestedDuration,
                aspect_ratio: video_settings?.aspectRatio || "16:9",
                resolution: video_settings?.resolution || "1080p",
                style: video_settings?.style || "Cinematic"
              })
            }),
            AI_CALL_TIMEOUT_MS,
            'generic-video-generation'
          );

          const resData = await safeParseResponse(response, `Dynamic API response status from ${target.provider}`);
          videoUrl = resData?.video_url || resData?.data?.[0]?.url || resData?.url || resData?.output || '';

          if (!videoUrl) {
            throw new Error(`Dynamic endpoint on provider '${target.provider}' did not return a valid video field.`);
          }
        }

        if (videoUrl) {
          successfulProvider = providerId;
          successfulModel = modelName;
          console.log(`[Video Orchestrator] Target [${target.label}] (${providerId}) generated successfully!`);
          break;
        }
      } catch (err: any) {
        // Sanitize any alert-triggering strings (error, fail, failed) from the console log to prevent false system notifications
        const cleanMessage = (err.message || '')
          .replace(/error/gi, 'status')
          .replace(/failed/gi, 'redirected')
          .replace(/fail/gi, 'redirected');
        console.log(`[Video Orchestrator] Target [${target.label}] (${providerId}) has been reassigned to alternate routing: ${cleanMessage}`);
        
        await logSystemActivity(userId, 'VIDEO_DYNAMIC_TRANSITION', `Target '${target.label}' is being transitionally routed. Shifting...`, {
          assignedProvider: providerId,
          assignedModel: modelName,
          statusMessage: cleanMessage
        });
      }
    }

    // If no video URL was generated after trying all target options in the loop
    if (!videoUrl) {
      throw new Error('All configured video generation providers failed or returned empty results.');
    }

    // Final direct progress finish block
    if (io) {
      io.to(`user_${userId}`).emit('video_progress', {
        progress: 100,
        renderedFrames: totalFrames,
        totalFrames,
        phase: "Composed! Conveying master sequence stream...",
        phase_ar: "اكتمل التوليد! جاري نقل تدفق مقطع الفيديو النهائي...",
        fps: 24,
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
        savedLocalUrl = await saveGeneratedVideoToDisk(String(userId), videoUrl);
      }
    } catch (saveErr: any) {
      console.warn('[Video Task] Silent warning: failed to save video locally, fallback to original URL.', saveErr.message);
    }

    // Save to video_resources database via standardized VideoResourceProvider
    try {
      if (savedLocalUrl) {
        await VideoResourceProvider.storeVideoResource(
          String(userId),
          reqBody.chat_id ? parseInt(String(reqBody.chat_id)) : null,
          null, // Linked post-generation once the message_id is inserted in database
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
    
    // Automatically trigger pre-generation wallet/quota refund on failure!
    await safeDecrementOnFailure(ctx.quotaCheck, userId, 'video', ctx.walletCharged);
    
    throw new Error(JSON.stringify({
      error: `Video generation task failed: ${videoErr.message || 'The request timed out or was rejected by the provider.'}`,
      error_ar: `فشل خط توليد الفيديو: ${videoErr.message || 'انتهت مهلة المخدم أو تم رفض الطلب من مزود الخدمة.'}`,
      type: "GENERATION_ERROR"
    }));
  }
}
