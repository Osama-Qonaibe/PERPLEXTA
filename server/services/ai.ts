import fs from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { pool } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';

export async function handleApiError(response: Response, provider: string, apiKey: string) {
  if (!response.ok) {
    let errorDetail = '';
    try {
      const data = await response.json();
      errorDetail = JSON.stringify(data.error || data);
    } catch (e) {
      errorDetail = await response.text();
    }
    console.error(`[Orchestrator] ${provider} API Error (${response.status}): ${errorDetail}`);
    throw new Error(`${provider} API Error (${response.status}): ${errorDetail}`);
  }
}

export async function syncProviderModelsInternal(providerId: string, apiKey: string) {
  let models: any[] = [];
  let count = 0;
  const provider = providerId.toLowerCase();

  try {
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });
      await handleApiError(response, 'OpenAI', apiKey);
      const data: any = await response.json();
      models = (data.data || []).map((m: any) => ({ ...m, name: m.id }));
    } else if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 
          'x-api-key': apiKey, 
          'anthropic-version': '2023-06-01',
          'Accept': 'application/json'
        }
      });
      await handleApiError(response, 'Anthropic', apiKey);
      const data: any = await response.json();
      models = (data.data || []).map((m: any) => ({ ...m, name: m.id }));
    } else if (provider === 'google' || provider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        headers: { 'Accept': 'application/json' }
      });
      await handleApiError(response, 'Google AI', apiKey);
      const data: any = await response.json();
      models = (data.models || []).map((m: any) => ({
        ...m,
        id: m.name,
        name: m.displayName || m.name.replace('models/', ''),
        supportedMethods: m.supportedGenerationMethods || []
      }));
    } else if (provider === 'together') {
      const response = await fetch('https://api.together.xyz/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });
      await handleApiError(response, 'Together AI', apiKey);
      const data: any = await response.json();
      models = (data || []).map((m: any) => ({ id: m.id, name: m.display_name || m.id }));
    } else if (provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });
      await handleApiError(response, 'OpenRouter', apiKey);
      const data: any = await response.json();
      models = (data.data || []).map((m: any) => ({ id: m.id, name: m.name || m.id }));
    } else if (provider === 'xai' || provider === 'grok') {
      const response = await fetch('https://api.x.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });
      await handleApiError(response, 'xAI', apiKey);
      const data: any = await response.json();
      models = (data.data || []).map((m: any) => ({ id: m.id, name: m.id }));
    } else if (provider === 'ollama') {
        let baseUrl = apiKey.split(':')[0] || 'http://localhost:11434';
        const response = await fetch(`${baseUrl}/api/tags`);
        if (response.ok) {
            const data = await response.json();
            models = (data.models || []).map((m: any) => ({ id: m.name, name: m.name }));
        }
    }
    count = models.length;

    if (count > 0) {
      await pool.query(
        'UPDATE api_keys_vault SET models = $1, model_list = $1, is_active = true, updated_at = CURRENT_TIMESTAMP WHERE provider = $2',
        [JSON.stringify(models), providerId]
      );
    }
    return { models, count };
  } catch (error) {
    console.error(`[SyncInternal] Error syncing ${providerId}:`, error);
    await pool.query('UPDATE api_keys_vault SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE provider = $1', [providerId]);
    throw error;
  }
}

// In-memory Vault Cache for Zero-Latency access (0.001ms)
const vaultCache = new Map<string, string>();

/**
 * Get provider key with Zero-Latency from cache or DB sync
 */
export async function getProviderKey(provider: string): Promise<string | null> {
  const normProvider = provider.toLowerCase().replace(/\s+/g, '');
  
  // 1. Check Hot Cache
  if (vaultCache.has(normProvider)) {
    return vaultCache.get(normProvider)!;
  }

  // 2. Cold lookup & Hydrate Cache
  const result = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [normProvider]);
  if (result.rows.length === 0) return null;

  const decryptedKey = decrypt(result.rows[0].encrypted_key);
  vaultCache.set(normProvider, decryptedKey);
  return decryptedKey;
}

/**
 * Invalidate cache for a specific provider (e.g. after update)
 */
export function invalidateVaultCache(provider?: string) {
  if (provider) {
    vaultCache.delete(provider.toLowerCase());
  } else {
    vaultCache.clear();
  }
}

export async function checkProviderStatus(provider: string, apiKey: string) {
    try {
        const normProvider = provider.toLowerCase();
        let status = { isValid: false, usage: 0, limit: 0, message: '' };

        if (normProvider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            status.isValid = res.ok;
            if (!res.ok) status.message = `OpenAI: ${res.statusText}`;
        } else if (normProvider === 'deepseek') {
            const res = await fetch('https://api.deepseek.com/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            status.isValid = res.ok;
            if (!res.ok) status.message = `DeepSeek: ${res.statusText}`;
        } else if (normProvider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/models', {
                headers: { 
                  'x-api-key': apiKey, 
                  'anthropic-version': '2023-06-01',
                  'Accept': 'application/json'
                }
            });
            status.isValid = res.ok;
            if (!res.ok) status.message = `Anthropic: ${res.statusText}`;
        } else if (normProvider === 'google' || normProvider === 'gemini') {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            status.isValid = res.ok;
            if (!res.ok) status.message = `Google AI: ${res.statusText}`;
        } else if (normProvider === 'together') {
            const res = await fetch('https://api.together.xyz/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            status.isValid = res.ok;
        } else if (normProvider === 'openrouter') {
            const res = await fetch('https://openrouter.ai/api/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            status.isValid = res.ok;
        } else if (normProvider === 'ollama') {
            // Ollama is local, usually 'host:port' stored in key/urlKey
            status.isValid = true;
        }

        return status;
    } catch (e: any) {
        return { isValid: false, usage: 0, limit: 0, message: e.message };
    }
}

export async function callAIProvider(
  provider: string, 
  model: string, 
  apiKey: string, 
  prompt: string, 
  systemPrompt?: string, 
  onChunk?: (chunk: string) => void, 
  history: { role: string, content: string }[] = [],
  options: any = {}
) {
  const normProvider = provider.toLowerCase().replace(/\s+/g, '');
  const cleanApiKey = apiKey ? apiKey.trim() : '';
  if (!cleanApiKey) throw new Error(`No valid API key provided for ${provider}`);

  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  history.forEach(msg => messages.push({ role: msg.role, content: msg.content }));

  let messageContent: any = prompt;
  if (options.fileData?.data) {
     const { type: mimeType, data: base64Data, name: fileName } = options.fileData;
     const isImage = mimeType.startsWith('image/');
     const isVideo = mimeType.startsWith('video/');
     const isAudio = mimeType.startsWith('audio/');
     const isPdf = mimeType === 'application/pdf';
     
     if (isImage || isVideo || isAudio || isPdf) {
         messageContent = [
             { type: 'text', text: prompt },
             { 
                 type: isImage ? 'image' : (isVideo ? 'video' : (isAudio ? 'audio' : 'file')), 
                 mime_type: mimeType, 
                 data: base64Data,
                 name: fileName
             }
         ];
     }
  }
  messages.push({ role: 'user', content: messageContent });

  const isStreaming = !!onChunk;
  const processedMessages = messages;

  async function handleResponse(response: Response) {
    if (!response.ok) {
       const text = await response.text();
       throw new Error(`API Error (${response.status}): ${text.substring(0, 500)}`);
    }

    if (isStreaming && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let resultText = '';
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.substring(6);
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              let chunk = '';
              if (normProvider === 'anthropic') {
                if (data.type === 'content_block_delta') chunk = data.delta?.text || '';
              } else if (normProvider.includes('google') || normProvider.includes('gemini')) {
                chunk = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              } else {
                chunk = data.choices?.[0]?.delta?.content || '';
              }
              if (chunk) { resultText += chunk; onChunk(chunk); }
            } catch (e) {}
          }
        }
      }
      return resultText;
    } else {
      const data = await response.json();
      if (normProvider === 'anthropic') return data.content?.[0]?.text || '';
      if (normProvider.includes('google') || normProvider.includes('gemini')) return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return data.choices?.[0]?.message?.content || '';
    }
  }

  let url = '';
  let headers: any = { 'Content-Type': 'application/json' };
  let body: any = {};

  if (normProvider === 'openai' || normProvider === 'deepseek') {
    url = normProvider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/chat/completions';
    headers['Authorization'] = `Bearer ${cleanApiKey}`;
    body = { model, messages: processedMessages, stream: isStreaming };
  } else if (normProvider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers['x-api-key'] = cleanApiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = { model, max_tokens: 1024, stream: isStreaming, messages: processedMessages.filter(m => m.role !== 'system') };
    if (systemPrompt) body.system = systemPrompt;
  } else if (normProvider.includes('google') || normProvider.includes('gemini')) {
    const method = isStreaming ? 'streamGenerateContent' : 'generateContent';
      // Sovereign High-Precision Model Path Resolution
      let modelPath = model;
      if (!modelPath.includes('/')) {
        modelPath = `models/${modelPath}`;
      }
      url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:${method}?key=${cleanApiKey}`;
      if (isStreaming) url += '&alt=sse';
      body = { contents: processedMessages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: Array.isArray(m.content) ? m.content.map((c: any) => ({ text: c.text })) : [{ text: String(m.content) }] })) };
      if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return handleResponse(res);
}
