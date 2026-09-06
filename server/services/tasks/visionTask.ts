import { dispatchGpuTask } from '../gpu/gpuTaskDispatcher.js';
import { safeDecrementOnFailure } from './utils.js';
import type { TaskExecutionContext } from '../orchestratorRegistry.js';
import { io } from '../../config/socket.js';

export async function executeVisionTask(ctx: TaskExecutionContext): Promise<{ result: string; latencyMs?: number; providerId?: string; modelId?: string }> {
  const { reqBody, userId, route, quotaCheck, walletCharged, finalPrompt } = ctx;
  const toolIdStr = 'vision';

  if (io && userId) {
    io.to(`user_${userId}`).emit('vision_progress', {
      progress: 15,
      status: 'analyzing',
      status_ar: 'تجهيز مصفوفات الرؤية الحاسوبية واختيار خادم الـ GPU الأمثل...',
      status_en: 'Initializing computer vision matrices & selecting optimal GPU node...'
    });
  }

  // Extract images from request body or file_data
  const imageUrls: string[] = [];

  if (reqBody.image_urls && Array.isArray(reqBody.image_urls)) {
    imageUrls.push(...reqBody.image_urls);
  } else if (reqBody.image_url) {
    imageUrls.push(reqBody.image_url);
  }

  if (reqBody.file_data && reqBody.file_data.data) {
    const mime = reqBody.file_data.type || 'image/jpeg';
    imageUrls.push(`data:${mime};base64,${reqBody.file_data.data}`);
  }

  if (imageUrls.length === 0) {
    await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
    throw new Error(JSON.stringify({
      error: 'Vision analysis requires at least one image attachment or valid image URL.',
      error_ar: 'تتطلب أداة الرؤية الحاسوبية إرفاق صورة واحدة على الأقل أو رابط صورة صالح.',
      type: 'INVALID_INPUT'
    }));
  }

  if (!route || !route.primary_provider || !route.primary_model || !route.is_active) {
    await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
    throw new Error(JSON.stringify({
      error: 'Vision analysis is currently unconfigured or inactive in the Tool Orchestrator.',
      error_ar: 'أداة الرؤية الحاسوبية غير مهيأة أو معطلة حالياً في نظام توجيه النماذج (الأوركسترا). يرجى تعيين مزود ونموذج للرؤية من لوحة التحكم.',
      type: 'SYSTEM_INACTIVE'
    }));
  }

  try {
    const response = await dispatchGpuTask({
      userId,
      taskType: 'vision_analysis',
      preferredProviderId: route.primary_provider,
      preferredModelId: route.primary_model,
      prompt: finalPrompt || 'Analyze this image in detail with comprehensive professional technical precision.',
      imageUrls
    });

    if (io && userId) {
      io.to(`user_${userId}`).emit('vision_progress', {
        progress: 100,
        status: 'completed',
        status_ar: 'اكتمل التحليل البصري بنجاح!',
        status_en: 'Visual analysis completed successfully!'
      });
    }

    return {
      result: response.text || '',
      latencyMs: response.latencyMs,
      providerId: response.providerId,
      modelId: response.modelId
    };
  } catch (err: any) {
    await safeDecrementOnFailure(quotaCheck, userId, toolIdStr, walletCharged);
    console.error('[VisionTask] Execution failed:', err.message);
    throw err;
  }
}
