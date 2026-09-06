import { selectOptimalGpuNodes, createGpuExecutionJob, updateGpuExecutionJob, recordProviderExecutionSuccess, recordProviderExecutionFailure } from './gpuLoadBalancer.js';
import { saveGeneratedImageToDisk, saveGeneratedVideoToDisk } from '../files.js';
import { io } from '../../config/socket.js';
import { pool } from '../../db/index.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

function cleanAndPadBase64(input: string): string {
  if (!input) return '';
  let str = input.trim();
  if (str.includes('base64,')) {
    str = str.split('base64,')[1].trim();
  }
  str = str.replace(/[\r\n\s]/g, '');
  const remainder = str.length % 4;
  if (remainder === 2) {
    str += '==';
  } else if (remainder === 3) {
    str += '=';
  } else if (remainder === 1) {
    str = str.slice(0, -1);
  }
  return str;
}

async function resolveImageToRawBase64(imgUrl: string): Promise<string> {
  if (!imgUrl) return '';
  
  if (imgUrl.startsWith('data:image/')) {
    return cleanAndPadBase64(imgUrl);
  }

  if (imgUrl.startsWith('/uploads/') || (!imgUrl.startsWith('http://') && !imgUrl.startsWith('https://'))) {
    try {
      const cleanPath = imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl;
      const fullPath = path.join(process.cwd(), cleanPath);
      const buf = await fs.readFile(fullPath);
      return buf.toString('base64');
    } catch (e) {
      console.warn('[resolveImageToRawBase64] Could not read local file:', e);
    }
  } else if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
    try {
      const res = await fetch(imgUrl);
      if (res.ok) {
        const arr = await res.arrayBuffer();
        const buf = Buffer.from(arr);
        return buf.toString('base64');
      }
    } catch (e) {
      console.warn('[resolveImageToRawBase64] Could not fetch remote file:', e);
    }
  }
  
  return cleanAndPadBase64(imgUrl);
}

async function resolveImageToBase64(imgUrl: string): Promise<string> {
  const raw = await resolveImageToRawBase64(imgUrl);
  if (!raw) return '';
  return `data:image/png;base64,${raw}`;
}

export interface StandardGpuRequest {
  jobId?: string;
  userId?: number;
  taskType: 'vision_analysis' | 'image_gen' | 'video_gen';
  preferredProviderId?: string;
  preferredModelId?: string;
  prompt: string;
  systemPrompt?: string;
  imageUrls?: string[]; // for vision
  videoUrl?: string;
  imageSettings?: {
    aspectRatio?: string;
    style?: string;
    quality?: string;
    width?: number;
    height?: number;
    steps?: number;
    seed?: number;
  };
  videoSettings?: {
    duration?: number;
    resolution?: string;
    fps?: number;
    aspectRatio?: string;
    seed?: number;
  };
  timeoutSeconds?: number;
}

export interface StandardGpuResponse {
  jobId: string;
  status: 'completed' | 'failed';
  providerId: string;
  modelId: string;
  taskType: string;
  text?: string;
  mediaUrl?: string;
  latencyMs: number;
  rawResponse?: any;
  failoverCount: number;
}

/**
 * Universal Unified GPU Task Dispatcher
 * Dispatches vision, image, and video tasks across dynamic GPU clusters
 * (RunPod Serverless, ComfyUI Workers, vLLM / OpenAI Vision, and Custom Microservices)
 * with automated load balancing, silent failover, and persistent asset storage.
 */
export async function dispatchGpuTask(request: StandardGpuRequest): Promise<StandardGpuResponse> {
  const jobId = request.jobId || `gpu_job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const startTime = Date.now();

  // 1. Select and rank operational nodes
  let candidates = await selectOptimalGpuNodes(request.taskType, request.preferredProviderId);

  // If a specific provider and model was requested by the Orchestrator, strictly bind to it
  if (request.preferredProviderId && request.preferredModelId) {
    const matched = candidates.find(
      c => c.provider.provider_id.toLowerCase() === request.preferredProviderId?.toLowerCase() &&
           c.model.model_id.toLowerCase() === request.preferredModelId?.toLowerCase()
    );
    if (matched) {
      // Strictly bind to the chosen provider and model with zero unauthorized background failover to other servers
      candidates = [matched];
    } else {
      throw new Error(JSON.stringify({
        error: `The specified GPU server '${request.preferredProviderId}' with model '${request.preferredModelId}' is currently unavailable or inactive in GPU Infrastructure.`,
        error_ar: `خادم الـ GPU الموجه '${request.preferredProviderId}' مع النموذج '${request.preferredModelId}' غير متاح أو معطل في قسم خوادم الـ GPU.`,
        type: 'GPU_MODEL_UNAVAILABLE'
      }));
    }
  }

  if (candidates.length === 0) {
    throw new Error(JSON.stringify({
      error: `No operational GPU nodes found for task type '${request.taskType}'. Please verify your GPU Infrastructure in the Admin Panel.`,
      error_ar: `لم يتم العثور على خوادم GPU تشغيلية مناسبة لمهمة '${request.taskType}'. يرجى التحقق من إعدادات مزودي الـ GPU في لوحة التحكم.`,
      type: 'GPU_NODES_UNAVAILABLE'
    }));
  }

  // 2. Initialize execution job in database
  await createGpuExecutionJob({
    jobId,
    userId: request.userId,
    providerId: candidates[0].provider.id,
    modelId: candidates[0].model.model_id,
    taskType: request.taskType,
    prompt: request.prompt,
    parameters: {
      imageSettings: request.imageSettings,
      videoSettings: request.videoSettings,
      imageCount: request.imageUrls?.length || 0
    }
  });

  let lastError: Error | null = null;
  let failoverCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const { provider, model } = candidate;

    console.log(`[GpuDispatcher] Attempt ${i + 1}/${candidates.length}: Dispatching ${request.taskType} to [${provider.provider_id}/${model.model_id}]`);

    // Emit live progress if user socket is connected
    if (io && request.userId) {
      io.to(`user_${request.userId}`).emit('gpu_task_progress', {
        jobId,
        progress: Math.min(90, 20 + i * 20),
        status: 'executing',
        providerName: provider.name,
        attempt: i + 1,
        status_ar: `توجيه المهمة إلى خادم المعالجة [${provider.name}] (${model.name})...`,
        status_en: `Routing task to GPU node [${provider.name}] (${model.name})...`
      });
    }

    const nodeStartTime = Date.now();

    try {
      let outputText: string | undefined;
      let outputMediaUrl: string | undefined;
      let rawResult: any;

      if (request.taskType === 'vision_analysis') {
        const res = await executeVisionWorker(provider, model.model_id, request);
        outputText = res.text;
        rawResult = res.raw;
      } else if (request.taskType === 'image_gen') {
        const res = await executeImageWorker(provider, model.model_id, request);
        rawResult = res.raw;
        // Save to persistent storage to prevent link expiration
        if (res.imageUrl) {
          const userStr = request.userId ? String(request.userId) : 'system';
          outputMediaUrl = await saveGeneratedImageToDisk(userStr, res.imageUrl);
        }
      } else if (request.taskType === 'video_gen') {
        const res = await executeVideoWorker(provider, model.model_id, request);
        rawResult = res.raw;
        outputMediaUrl = res.videoUrl;
        if (res.videoUrl && !res.videoUrl.startsWith('/uploads/')) {
          const userStr = request.userId ? String(request.userId) : 'system';
          try {
            const diskUrl = await saveGeneratedVideoToDisk(userStr, res.videoUrl);
            outputMediaUrl = diskUrl;
          } catch (err: any) {
            console.warn('[GpuDispatcher] Background video disk save warning:', err.message);
          }
        }
      }

      const nodeLatency = Date.now() - nodeStartTime;
      const totalLatency = Date.now() - startTime;

      // Update provider metrics & database job
      await recordProviderExecutionSuccess(provider.id, nodeLatency);
      await updateGpuExecutionJob(jobId, {
        status: 'completed',
        providerId: provider.id,
        modelId: model.model_id,
        resultUrl: outputMediaUrl,
        resultData: outputText ? { text: outputText } : rawResult,
        latencyMs: totalLatency,
        attempts: i + 1,
        failoverCount
      });

      console.log(`[GpuDispatcher] Task completed successfully via [${provider.provider_id}] in ${nodeLatency}ms (Total: ${totalLatency}ms)`);

      return {
        jobId,
        status: 'completed',
        providerId: provider.provider_id,
        modelId: model.model_id,
        taskType: request.taskType,
        text: outputText,
        mediaUrl: outputMediaUrl,
        latencyMs: totalLatency,
        rawResponse: rawResult,
        failoverCount
      };
    } catch (err: any) {
      failoverCount++;
      lastError = err;
      const errorMsg = err.message || 'Unknown GPU worker error';
      console.error(`[GpuDispatcher] Failover triggered: Node [${provider.provider_id}] failed:`, errorMsg);

      // Record failure on this node
      await recordProviderExecutionFailure(provider.id, errorMsg);
      await updateGpuExecutionJob(jobId, {
        failoverCount,
        errorMessage: `Attempt ${i + 1} (${provider.provider_id}) failed: ${errorMsg.slice(0, 300)}`
      });

      // Continue to next available candidate
    }
  }

  // All candidates failed
  const finalLatency = Date.now() - startTime;
  await updateGpuExecutionJob(jobId, {
    status: 'failed',
    errorMessage: lastError?.message || 'All GPU candidates failed',
    latencyMs: finalLatency,
    failoverCount
  });

  throw lastError || new Error(`Execution failed across all ${candidates.length} GPU nodes.`);
}

/**
 * Worker: Vision Analysis Execution
 */
async function executeVisionWorker(
  provider: any,
  modelId: string,
  request: StandardGpuRequest
): Promise<{ text: string; raw: any }> {
  let targetUrl = provider.base_url.trim().replace(/\/+$/, '');
  const apiKey = provider.decryptedKey;

  if (provider.provider_type === 'runpod_serverless') {
    if (provider.endpoint_id) {
      targetUrl = `https://api.runpod.ai/v2/${provider.endpoint_id.trim()}/openai/v1/chat/completions`;
    } else {
      targetUrl = `${targetUrl}/chat/completions`;
    }
  } else {
    targetUrl = targetUrl.endsWith('/v1') ? `${targetUrl}/chat/completions` : `${targetUrl}/v1/chat/completions`;
  }

  const contentParts: any[] = [];
  if (request.imageUrls && request.imageUrls.length > 0) {
    for (const img of request.imageUrls) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: img.startsWith('data:') || img.startsWith('http') ? img : `data:image/jpeg;base64,${img}`
        }
      });
    }
  }

  contentParts.push({
    type: 'text',
    text: request.prompt
  });

  const messages: any[] = [];
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }
  messages.push({ role: 'user', content: contentParts });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const timeoutMs = (request.timeoutSeconds || provider.config?.timeout_seconds || 60) * 1000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: 4096,
        temperature: 0.2
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`Worker HTTP ${res.status}: ${errTxt.slice(0, 300)}`);
    }

    const data: any = await res.json();
    const choice = data?.choices?.[0];
    const text = choice?.message?.content || choice?.text || '';

    if (!text) {
      throw new Error('Worker returned empty text output');
    }

    return { text, raw: data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Worker execution timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  }
}

/**
 * Worker: Image Generation Execution
 */
async function executeImageWorker(
  provider: any,
  modelId: string,
  request: StandardGpuRequest
): Promise<{ imageUrl: string; raw: any }> {
  const apiKey = provider.decryptedKey;
  let targetUrl = provider.base_url.trim().replace(/\/+$/, '');

  const aspect = request.imageSettings?.aspectRatio || '1:1';
  let width = 1024;
  let height = 1024;

  if (aspect === '16:9') {
    width = 1344; height = 768;
  } else if (aspect === '9:16') {
    width = 768; height = 1344;
  } else if (aspect === '4:3') {
    width = 1152; height = 864;
  } else if (aspect === '3:4') {
    width = 864; height = 1152;
  } else if (aspect === '3:2') {
    width = 1216; height = 832;
  } else if (aspect === '2:3') {
    width = 832; height = 1216;
  } else if (aspect === '21:9') {
    width = 1536; height = 640;
  } else {
    width = 1024; height = 1024;
  }

    // 1. ComfyUI Worker
    if (provider.provider_type === 'comfyui_worker') {
      return await executeComfyUiWorkflow(targetUrl, apiKey, modelId, request.prompt, width, height, request.imageSettings);
    }

  // 2. RunPod Serverless
  if (provider.provider_type === 'runpod_serverless' && provider.endpoint_id) {
    const runpodUrl = `https://api.runpod.ai/v2/${provider.endpoint_id.trim()}`;
    const seed = request.imageSettings?.seed || Math.floor(Math.random() * 1000000);
    const steps = request.imageSettings?.steps || 25;

    let checkpointName = "";
    if (modelId && (modelId.endsWith('.safetensors') || modelId.endsWith('.ckpt'))) {
      checkpointName = modelId;
    } else if (modelId && modelId !== provider.endpoint_id && modelId !== provider.provider_id) {
      checkpointName = modelId.includes('.') ? modelId : `${modelId}.safetensors`;
    } else {
      const dbModelRes = await pool.query(
        "SELECT model_id FROM gpu_provider_models WHERE provider_id = $1 AND (model_id LIKE '%.safetensors' OR model_id LIKE '%.ckpt') ORDER BY id DESC LIMIT 1",
        [provider.id]
      );
      if (dbModelRes.rows.length > 0) {
        checkpointName = dbModelRes.rows[0].model_id;
      } else {
        throw new Error(JSON.stringify({
          error: `No valid model checkpoint registered for GPU server '${provider.name}'. Please register or sync models in GPU Infrastructure.`,
          error_ar: `لا يوجد نموذج أو نقطة تفتيش مسجلة لخادم الـ GPU '${provider.name}'. يرجى مزامنة أو إضافة النماذج من قسم خوادم الـ GPU.`,
          type: 'GPU_NO_CHECKPOINT_FOUND'
        }));
      }
    }

    const isFlux = checkpointName.toLowerCase().includes('flux');

    // ComfyUI API workflow object: tailored for Flux (with FluxGuidance and EmptySD3LatentImage) or standard SD models
    const comfyWorkflow = isFlux ? {
      "6": {
        "inputs": { "text": request.prompt, "clip": ["30", 1] },
        "class_type": "CLIPTextEncode",
        "_meta": { "title": "CLIP Text Encode (Positive Prompt)" }
      },
      "8": {
        "inputs": { "samples": ["31", 0], "vae": ["30", 2] },
        "class_type": "VAEDecode",
        "_meta": { "title": "VAE Decode" }
      },
      "9": {
        "inputs": { "filename_prefix": "ComfyUI", "images": ["8", 0] },
        "class_type": "SaveImage",
        "_meta": { "title": "Save Image" }
      },
      "27": {
        "inputs": { "width": width, "height": height, "batch_size": 1 },
        "class_type": "EmptySD3LatentImage",
        "_meta": { "title": "EmptySD3LatentImage" }
      },
      "30": {
        "inputs": { "ckpt_name": checkpointName },
        "class_type": "CheckpointLoaderSimple",
        "_meta": { "title": "Load Checkpoint" }
      },
      "31": {
        "inputs": {
          "seed": seed,
          "steps": Math.max(10, Math.min(steps, 28)),
          "cfg": 1,
          "sampler_name": "euler",
          "scheduler": "simple",
          "denoise": 1,
          "model": ["30", 0],
          "positive": ["35", 0],
          "negative": ["33", 0],
          "latent_image": ["27", 0]
        },
        "class_type": "KSampler",
        "_meta": { "title": "KSampler" }
      },
      "33": {
        "inputs": { "text": "", "clip": ["30", 1] },
        "class_type": "CLIPTextEncode",
        "_meta": { "title": "CLIP Text Encode (Negative Prompt)" }
      },
      "35": {
        "inputs": { "guidance": 3.5, "conditioning": ["6", 0] },
        "class_type": "FluxGuidance",
        "_meta": { "title": "FluxGuidance" }
      }
    } : {
      "3": {
        "inputs": {
          "seed": seed,
          "steps": steps,
          "cfg": 3.5,
          "sampler_name": "euler",
          "scheduler": "simple",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": { "ckpt_name": checkpointName },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": { "width": width, "height": height, "batch_size": 1 },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": { "text": request.prompt, "clip": ["4", 1] },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": { "text": "", "clip": ["4", 1] },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": { "filename_prefix": "Perplexta_AI", "images": ["8", 0] },
        "class_type": "SaveImage"
      }
    };

    const runpodRes = await executeRunPodServerless(runpodUrl, apiKey, {
      input: {
        prompt: request.prompt,
        width,
        height,
        num_inference_steps: steps,
        seed: seed,
        workflow: comfyWorkflow,
        workflow_json: comfyWorkflow
      }
    }, 'image');

    if (!runpodRes.imageUrl) {
      throw new Error('RunPod serverless image generation did not return a valid image URL');
    }
    return { imageUrl: runpodRes.imageUrl, raw: runpodRes.raw };
  }

  // 3. OpenAI-compatible / Custom REST / vLLM Image endpoint
  const endpoint = targetUrl.endsWith('/v1') 
    ? `${targetUrl}/images/generations` 
    : `${targetUrl}/v1/images/generations`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const timeoutMs = (request.timeoutSeconds || 90) * 1000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        prompt: request.prompt,
        n: 1,
        size: `${width}x${height}`
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`Image API HTTP ${res.status}: ${errTxt.slice(0, 300)}`);
    }

    const data: any = await res.json();
    const url = data?.data?.[0]?.url || data?.data?.[0]?.b64_json || data?.image_url || '';
    if (!url) {
      throw new Error('Image API returned empty image URL');
    }

    return { imageUrl: url, raw: data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Image generation timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  }
}

/**
 * Worker: Video Generation Execution
 */
async function executeVideoWorker(
  provider: any,
  modelId: string,
  request: StandardGpuRequest
): Promise<{ videoUrl: string; raw: any }> {
  const apiKey = provider.decryptedKey;
  let targetUrl = provider.base_url.trim().replace(/\/+$/, '');

  // Hosted model identifier resolution: fallback gracefully to provider endpoint or config if modelId is generic
  const activeModelName = modelId || provider.config?.default_model || provider.endpoint_id || 'default_video_model';

  if (provider.provider_type === 'runpod_serverless' && provider.endpoint_id) {
    const runpodUrl = `https://api.runpod.ai/v2/${provider.endpoint_id.trim()}`;
    const seed = request.videoSettings?.seed || request.imageSettings?.seed || Math.floor(Math.random() * 1000000);
    const aspect = request.videoSettings?.aspectRatio || '9:16';
    
    let width = 480;
    let height = 832;
    if (aspect === '16:9') {
      width = 832;
      height = 480;
    } else if (aspect === '1:1') {
      width = 640;
      height = 640;
    } else if (aspect === '4:3') {
      width = 768;
      height = 576;
    } else if (aspect === '21:9') {
      width = 1024;
      height = 432;
    }

    const duration = request.videoSettings?.duration || 4;
    const fps = request.videoSettings?.fps || 16;
    // Calculate total frames while ensuring VAE frame step compatibility (e.g., 4n+1 for Wan/Hunyuan 3D-VAE)
    const rawFrames = Math.round(duration * fps);
    const totalFrames = Math.min(121, Math.max(17, Math.floor((rawFrames - 1) / 4) * 4 + 1));

    // Dynamic checkpoint name resolution matching hosted model name or provider configuration
    let checkpointName = provider.config?.checkpoint_name || provider.config?.ckpt_name || '';
    if (!checkpointName) {
      if (activeModelName.endsWith('.safetensors') || activeModelName.endsWith('.ckpt') || activeModelName.endsWith('.pth') || activeModelName.endsWith('.gguf')) {
        checkpointName = activeModelName;
      }
    }

    let imageUrlToPass = '';
    let isImageAttached = false;

    if (request.imageUrls && request.imageUrls.length > 0) {
      const originalUrl = request.imageUrls[0];
      if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
        imageUrlToPass = originalUrl;
        isImageAttached = true;
      } else {
        const rawBase64 = await resolveImageToRawBase64(originalUrl);
        if (rawBase64) {
          imageUrlToPass = rawBase64.startsWith('data:') ? rawBase64 : `data:image/png;base64,${rawBase64}`;
          isImageAttached = true;
        }
      }
    }

    // Synthesize keyframe ONLY if model explicitly requires it or is forced in provider config
    if (!isImageAttached && provider.config?.force_image_to_video === true && request.prompt) {
      try {
        console.log(`[Video Dispatcher] Synthesizing initial keyframe for forced I2V prompt: "${request.prompt.slice(0, 60)}..."`);
        const imageRes = await dispatchGpuTask({
          userId: request.userId,
          taskType: 'image_gen',
          prompt: request.prompt,
          imageSettings: {
            aspectRatio: aspect,
            quality: 'standard'
          }
        });
        if (imageRes.mediaUrl) {
          imageUrlToPass = imageRes.mediaUrl;
          isImageAttached = true;
          console.log(`[Video Dispatcher] Successfully synthesized initial keyframe for video generation`);
        }
      } catch (imgErr: any) {
        console.warn(`[Video Dispatcher] Note: Image generation fallback skipped or unavailable (${imgErr.message})`);
      }
    }

    const cleanRawBase64 = isImageAttached 
      ? (imageUrlToPass.startsWith('data:') ? imageUrlToPass.split(',')[1] : imageUrlToPass)
      : 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAPklEQVR42u3BAQ0AAADCoPdPbQ43oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8GYYaAAB2T0ZMQAAAABJRU5ErkJggg==';

    // ComfyUI workflow template: check provider.config for custom workflow overrides or build dynamic adaptive workflow
    let comfyVideoWorkflow: any = null;
    if (provider.config?.workflow || provider.config?.workflow_json) {
      const rawTpl = provider.config.workflow || provider.config.workflow_json;
      try {
        const workflowStr = JSON.stringify(rawTpl)
          .replace(/\{prompt\}/g, request.prompt)
          .replace(/\{model\}/g, activeModelName)
          .replace(/\{checkpoint\}/g, checkpointName)
          .replace(/\{width\}/g, String(width))
          .replace(/\{height\}/g, String(height))
          .replace(/\{seed\}/g, String(seed))
          .replace(/\{duration\}/g, String(duration))
          .replace(/\{fps\}/g, String(fps))
          .replace(/\{totalFrames\}/g, String(totalFrames))
          .replace(/\{image\}/g, cleanRawBase64);
        comfyVideoWorkflow = JSON.parse(workflowStr);
      } catch (wfErr) {
        console.warn('[Video Dispatcher] Custom workflow template substitution failed, falling back to adaptive workflow');
      }
    }

    if (!comfyVideoWorkflow) {
      const node4Inputs: Record<string, any> = {};
      if (checkpointName) {
        node4Inputs.ckpt_name = checkpointName;
      }

      comfyVideoWorkflow = {
        "3": {
          "inputs": {
            "seed": seed,
            "steps": 25,
            "cfg": 6.0,
            "sampler_name": "euler",
            "scheduler": "normal",
            "denoise": 1.0,
            "model": ["4", 0],
            "positive": ["6", 0],
            "negative": ["7", 0],
            "latent_image": ["5", 0]
          },
          "class_type": "KSampler"
        },
        "4": {
          "inputs": node4Inputs,
          "class_type": "CheckpointLoaderSimple"
        },
        "5": {
          "inputs": { "width": width, "height": height, "batch_size": totalFrames },
          "class_type": "EmptyLatentImage"
        },
        "6": {
          "inputs": { "text": request.prompt, "clip": ["4", 1] },
          "class_type": "CLIPTextEncode"
        },
        "7": {
          "inputs": { "text": "blurry, low quality, distorted, watermark", "clip": ["4", 1] },
          "class_type": "CLIPTextEncode"
        },
        "8": {
          "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
          "class_type": "VAEDecode"
        },
        "9": {
          "inputs": {
            "filename_prefix": "Perplexta_Video",
            "fps": fps,
            "lossless": false,
            "quality": 85,
            "method": "default",
            "images": ["8", 0]
          },
          "class_type": "SaveAnimatedWEBP"
        }
      };
    }

    // Model-agnostic payload mapping accommodating any server-hosted vision/video model
    const runpodInput: any = {
      prompt: request.prompt,
      positive_prompt: request.prompt,
      text: request.prompt,
      prompt_text: request.prompt,
      input_prompt: request.prompt,
      video_prompt: request.prompt,
      negative_prompt: "blurry, low quality, distorted, artifacts",
      model: activeModelName,
      model_id: activeModelName,
      model_name: activeModelName,
      width,
      height,
      aspect_ratio: aspect,
      duration,
      fps,
      video_fps: fps,
      frames: totalFrames,
      num_frames: totalFrames,
      video_length: totalFrames,
      steps: 20, // Align steps exactly with user video value
      num_inference_steps: 20,
      cfg: 6.0,
      guidance_scale: 6.0,
      sampler_name: "euler",
      scheduler: "normal",
      denoise: 1.0,
      shift: 5.0,
      seed: seed,
      ...(provider.config?.extra_input || {})
    };

    if (provider.config?.workflow || provider.config?.use_comfy_workflow === true) {
      runpodInput.workflow = comfyVideoWorkflow;
      runpodInput.workflow_json = comfyVideoWorkflow;
    }

    if (checkpointName) {
      runpodInput.checkpoint = checkpointName;
      runpodInput.ckpt_name = checkpointName;
      runpodInput.checkpoint_name = checkpointName;
    }

    if (isImageAttached && imageUrlToPass) {
      const imageObject = {
        name: "input_image.png",
        image: imageUrlToPass
      };
      runpodInput.image = imageUrlToPass;
      runpodInput.image_data = imageUrlToPass;
      runpodInput.image_url = imageUrlToPass;
      runpodInput.init_image = imageUrlToPass;
      runpodInput.input_image = imageUrlToPass;
      runpodInput.first_frame_image = imageUrlToPass;
      runpodInput.images = [imageObject];
      runpodInput.input_images = [imageObject];
    }

    if (request.videoUrl) {
      runpodInput.video = request.videoUrl;
      runpodInput.video_url = request.videoUrl;
      runpodInput.input_video = request.videoUrl;
      runpodInput.source_video = request.videoUrl;
    }

    const runpodRes = await executeRunPodServerless(runpodUrl, apiKey, {
      input: runpodInput
    }, 'video');

    if (!runpodRes.videoUrl) {
      throw new Error('RunPod serverless video generation did not return a valid video URL');
    }
    return { videoUrl: runpodRes.videoUrl, raw: runpodRes.raw };
  }

  // Custom REST / generic video endpoint: Model-agnostic video generation
  const endpoint = provider.config?.endpoint_url || 
    (targetUrl.endsWith('/v1') ? `${targetUrl}/videos/generations` : 
     (targetUrl.includes('/videos/') || targetUrl.includes('/generations') ? targetUrl : `${targetUrl}/v1/videos/generations`));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(provider.config?.extra_headers || {})
  };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const timeoutMs = (request.timeoutSeconds || provider.config?.timeout_seconds || 300) * 1000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const aspect = request.videoSettings?.aspectRatio || '16:9';
    let width = 832;
    let height = 480;
    if (aspect === '9:16') { width = 480; height = 832; }
    else if (aspect === '1:1') { width = 640; height = 640; }
    else if (aspect === '4:3') { width = 768; height = 576; }
    else if (aspect === '3:4') { width = 576; height = 768; }
    else if (aspect === '3:2') { width = 864; height = 576; }
    else if (aspect === '2:3') { width = 576; height = 864; }
    else if (aspect === '21:9') { width = 1024; height = 432; }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: activeModelName,
        model_name: activeModelName,
        prompt: request.prompt,
        prompt_text: request.prompt,
        duration: request.videoSettings?.duration || 4,
        aspect_ratio: aspect,
        width,
        height,
        fps: request.videoSettings?.fps || 16,
        ...(provider.config?.extra_payload || {})
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errTxt = await res.text();
      throw new Error(`Video API HTTP ${res.status}: ${errTxt.slice(0, 300)}`);
    }

    const data: any = await res.json();
    const vUrl = parseMediaFromRunPodOutput(data, 'video');
    if (!vUrl) {
      throw new Error(`Video API on hosted model '${activeModelName}' returned an empty or unrecognized video output format.`);
    }
    return { videoUrl: vUrl, raw: data };
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Helper: Parse output media from arbitrary RunPod/ComfyUI worker structures
 */
function parseMediaFromRunPodOutput(
  output: any, 
  mediaType: 'image' | 'video',
  endpointUrl?: string,
  remoteId?: string
): string | null {
  if (!output) return null;

  if (typeof output === 'string') {
    const trimmed = output.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      if (endpointUrl) {
        const cleanEndpoint = endpointUrl.replace(/\/+$/, '');
        return `${cleanEndpoint}${trimmed}`;
      }
      return trimmed;
    }
    // If output is a filename (e.g. video.mp4, output_video.mp4) or short media descriptor
    if (/\.(mp4|webm|mov|avi|gif|webp|png|jpg|jpeg)$/i.test(trimmed)) {
      if (endpointUrl && remoteId) {
        const cleanEndpoint = endpointUrl.replace(/\/+$/, '');
        return `${cleanEndpoint}/stream/${remoteId}`;
      }
      return trimmed;
    }
    if (trimmed.length > 100 && !trimmed.includes(' ')) {
      return mediaType === 'image' ? `data:image/png;base64,${trimmed}` : `data:video/mp4;base64,${trimmed}`;
    }
  }

  if (Array.isArray(output) && output.length > 0) {
    for (const item of output) {
      const parsed = parseMediaFromRunPodOutput(item, mediaType, endpointUrl, remoteId);
      if (parsed) return parsed;
    }
  }

  if (typeof output === 'object') {
    const knownKeys = [
      'output_video', 'output_image', 'outputVideo', 'outputImage',
      'video_file', 'image_file', 'video_path', 'image_path',
      'images', 'videos', 'output', 'result', 'data', 'image', 'video', 
      'url', 'video_url', 'file', 'result_url', 'mp4', 'download_url', 
      'output_url', 'path', 'gifs', 'outputs', 'filename', 'media_url', 
      'b64_json', 'video_base64', 'base64', 'generated_video', 'media'
    ];
    for (const key of knownKeys) {
      if (output[key] !== undefined) {
        const parsed = parseMediaFromRunPodOutput(output[key], mediaType, endpointUrl, remoteId);
        if (parsed) return parsed;
      }
    }
    // Fallback: check all remaining object fields recursively
    for (const key of Object.keys(output)) {
      if (!knownKeys.includes(key) && output[key] !== undefined) {
        const parsed = parseMediaFromRunPodOutput(output[key], mediaType, endpointUrl, remoteId);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}

/**
 * Execute RunPod Serverless with Fast Sync + Polling Fallback
 */
async function executeRunPodServerless(
  endpointUrl: string,
  apiKey: string,
  payload: any,
  mediaType: 'image' | 'video' = 'image'
): Promise<{ imageUrl?: string; videoUrl?: string; raw: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  let remoteId: string | undefined = undefined;

  try {
    // Directly trigger /run (async) to avoid duplicate jobs and gateway timeouts from /runsync
    const runUrl = `${endpointUrl}/run`;
    const runRes = await fetch(runUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!runRes.ok) {
      const err = await runRes.text();
      throw new Error(`RunPod start failed (HTTP ${runRes.status}): ${err.slice(0, 200)}`);
    }

    const runData: any = await runRes.json();
    if (runData.status === 'FAILED' || runData.error) {
      throw new Error(`RunPod task failed: ${runData.error || 'Worker execution failed'}`);
    }

    remoteId = runData.id || runData.jobId;
    if (!remoteId) {
      throw new Error('RunPod did not return a valid task ID');
    }

    // 3. Polling loop with exponential/progressive wait
    const maxPollTimeMs = mediaType === 'video' ? 600000 : 180000; // 10 minutes for video, 3 minutes for image
    const pollStart = Date.now();
    const statusUrl = `${endpointUrl}/status/${remoteId}`;

    while (Date.now() - pollStart < maxPollTimeMs) {
      await new Promise(r => setTimeout(r, 2000));

      const statusRes = await fetch(statusUrl, { headers });
      if (!statusRes.ok) continue;

      const statusData: any = await statusRes.json();
      const normStatus = String(statusData?.status || '').toUpperCase();

      if (normStatus === 'COMPLETED' || normStatus === 'SUCCESS') {
        let media = parseMediaFromRunPodOutput(statusData.output, mediaType, endpointUrl, remoteId) || parseMediaFromRunPodOutput(statusData, mediaType, endpointUrl, remoteId);
        if (!media && endpointUrl && remoteId) {
          media = `${endpointUrl.replace(/\/+$/, '')}/stream/${remoteId}`;
        }
        if (media) {
          return mediaType === 'image' ? { imageUrl: media, raw: statusData } : { videoUrl: media, raw: statusData };
        }
        throw new Error('RunPod task completed but returned no valid media format');
      } else if (normStatus === 'FAILED' || normStatus === 'CANCELLED') {
        const errMsg = statusData.error || statusData.output?.error || (typeof statusData.output === 'string' ? statusData.output : 'Unknown remote worker failure');
        throw new Error(`RunPod task failed: ${errMsg}`);
      }
    }

    throw new Error('RunPod task timed out during polling');
  } catch (err) {
    if (remoteId) {
      try {
        await fetch(`${endpointUrl}/cancel`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ job_id: remoteId })
        });
        console.log(`[GpuDispatcher] Successfully cancelled orphan RunPod job ${remoteId}`);
      } catch (cancelErr) {
        // Ignore cancellation error
      }
    }
    throw err;
  }
}

/**
 * Execute ComfyUI Prompt Workflow and Poll Result
 */
async function executeComfyUiWorkflow(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  prompt: string,
  width: number,
  height: number,
  settings?: any
): Promise<{ imageUrl: string; raw: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  // Standard ComfyUI prompt payload
  const promptPayload = {
    prompt: {
      "3": {
        "inputs": {
          "seed": settings?.seed || Math.floor(Math.random() * 1000000),
          "steps": settings?.steps || 25,
          "cfg": 7.5,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        },
        "class_type": "KSampler"
      },
      "4": {
        "inputs": { "ckpt_name": modelId },
        "class_type": "CheckpointLoaderSimple"
      },
      "5": {
        "inputs": { "width": width, "height": height, "batch_size": 1 },
        "class_type": "EmptyLatentImage"
      },
      "6": {
        "inputs": { "text": prompt, "clip": ["4", 1] },
        "class_type": "CLIPTextEncode"
      },
      "7": {
        "inputs": { "text": "blurry, low quality, distorted, bad anatomy", "clip": ["4", 1] },
        "class_type": "CLIPTextEncode"
      },
      "8": {
        "inputs": { "samples": ["3", 0], "vae": ["4", 2] },
        "class_type": "VAEDecode"
      },
      "9": {
        "inputs": { "filename_prefix": "Perplexta_AI", "images": ["8", 0] },
        "class_type": "SaveImage"
      }
    }
  };

  const queueRes = await fetch(`${baseUrl}/prompt`, {
    method: 'POST',
    headers,
    body: JSON.stringify(promptPayload)
  });

  if (!queueRes.ok) {
    const err = await queueRes.text();
    throw new Error(`ComfyUI queue failed (HTTP ${queueRes.status}): ${err.slice(0, 200)}`);
  }

  const queueData: any = await queueRes.json();
  const promptId = queueData.prompt_id;
  if (!promptId) {
    throw new Error('ComfyUI did not return prompt_id');
  }

  // Poll history
  const pollStart = Date.now();
  while (Date.now() - pollStart < 120000) {
    await new Promise(r => setTimeout(r, 2000));
    const histRes = await fetch(`${baseUrl}/history/${promptId}`, { headers });
    if (!histRes.ok) continue;

    const histData: any = await histRes.json();
    if (histData[promptId]) {
      const outputs = histData[promptId].outputs;
      if (outputs) {
        for (const nodeId of Object.keys(outputs)) {
          const images = outputs[nodeId]?.images;
          if (Array.isArray(images) && images.length > 0) {
            const imgInfo = images[0];
            const imageUrl = `${baseUrl}/view?filename=${imgInfo.filename}&subfolder=${imgInfo.subfolder || ''}&type=${imgInfo.type || 'output'}`;
            return { imageUrl, raw: histData };
          }
        }
      }
    }
  }

  throw new Error('ComfyUI generation timed out');
}

/**
 * Recursive helper to find any visual/media URL within an arbitrary JSON response structure
 */
function findMediaUrlInResponse(obj: any, isVideo: boolean = false): string | undefined {
  if (!obj) return undefined;
  if (typeof obj === 'string') {
    const lower = obj.toLowerCase().trim();
    
    // Ignore control/queue endpoints and non-media URLs
    if (
      lower.includes('/requests/') || 
      lower.includes('/status') || 
      lower.includes('/cancel') ||
      lower.includes('response_url') ||
      lower.includes('status_url')
    ) {
      return undefined;
    }

    if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('data:')) {
      if (isVideo) {
        if (lower.startsWith('data:video/')) {
          return obj;
        }
        // Accept any http/https URL unless it explicitly ends with static image extensions
        if (!lower.endsWith('.png') && !lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.webp')) {
          return obj;
        }
      } else {
        if (lower.startsWith('data:image/')) {
          return obj;
        }
        // Accept any http/https URL unless it explicitly ends with video extensions
        if (!lower.endsWith('.mp4') && !lower.endsWith('.webm') && !lower.endsWith('.mov') && !lower.endsWith('.avi')) {
          return obj;
        }
      }
    }
    return undefined;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const url = findMediaUrlInResponse(item, isVideo);
      if (url) return url;
    }
  } else if (typeof obj === 'object') {
    const ignoredKeys = ['response_url', 'status_url', 'cancel_url', 'logs_url', 'queue_url', 'request_id', 'status', 'logs', 'metrics'];
    const priorityKeys = isVideo ? ['video', 'url', 'video_url', 'file'] : ['url', 'image', 'image_url', 'file', 'b64_json', 'images'];
    
    for (const key of priorityKeys) {
      if (key in obj && !ignoredKeys.includes(key)) {
        const url = findMediaUrlInResponse(obj[key], isVideo);
        if (url) return url;
      }
    }
    for (const key of Object.keys(obj)) {
      if (!priorityKeys.includes(key) && !ignoredKeys.includes(key)) {
        const url = findMediaUrlInResponse(obj[key], isVideo);
        if (url) return url;
      }
    }
  }
  return undefined;
}

