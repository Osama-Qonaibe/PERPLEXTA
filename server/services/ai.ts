import fs from 'fs/promises';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { pool } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';

export async function handleApiError(response: Response, provider: string) {
  if (!response.ok) {
    let errorDetail = '';
    try {
      const data = await response.json();
      errorDetail = JSON.stringify(data.error || data);
    } catch (e) {
      errorDetail = await response.text();
    }
    console.error(`[Orchestrator] ${provider} API Error (${response.status}): ${errorDetail.substring(0, 200)}`);
    throw new Error(`Connection to ${provider} failed. Please check your API key and quota.`);
  }
}

function cleanOllamaUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return 'http://localhost:11434';
  if (!url.startsWith('http')) {
    url = `http://${url}`;
  }
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  if (url.endsWith('/api')) {
    url = url.slice(0, -4);
  }
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
}

export async function syncProviderModelsInternal(providerId: string, apiKey: string, urlKey?: string) {
  let models: any[] = [];
  let count = 0;
  const provider = providerId.toLowerCase();

  try {
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });
      await handleApiError(response, 'OpenAI');
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
      await handleApiError(response, 'Anthropic');
      const data: any = await response.json();
      models = (data.data || []).map((m: any) => ({ ...m, name: m.id }));
    } else if (provider === 'google' || provider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
        headers: { 
          'Accept': 'application/json',
          'x-goog-api-key': apiKey
        }
      });
      await handleApiError(response, 'Google AI');
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
      await handleApiError(response, 'Together AI');
      const data: any = await response.json();
      models = (data || []).map((m: any) => ({ id: m.id, name: m.display_name || m.id }));
    } else if (provider === 'openrouter') {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });
      await handleApiError(response, 'OpenRouter');
      const data: any = await response.json();
      models = (data.data || []).map((m: any) => ({ id: m.id, name: m.name || m.id }));
    } else if (provider === 'xai' || provider === 'grok') {
      const response = await fetch('https://api.x.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });
      await handleApiError(response, 'xAI');
      const data: any = await response.json();
      models = (data.data || []).map((m: any) => ({ id: m.id, name: m.id }));
    } else if (provider === 'ollama') {
        const cleanUrl = cleanOllamaUrl(urlKey || '');
        const targetHeaders: any = { 'Accept': 'application/json' };
        if (apiKey && apiKey.trim() !== '') {
            targetHeaders['Authorization'] = `Bearer ${apiKey}`;
        }
        const response = await fetch(`${cleanUrl}/api/tags`, { headers: targetHeaders });
        await handleApiError(response, 'Ollama');
        const data = await response.json();
        models = (data.models || []).map((m: any) => ({ id: m.name, name: m.name }));
    } else {
        // Fallback for custom or arbitrary providers (treated as OpenAI-compatible)
        let baseUrl = urlKey;
        if (!baseUrl) {
            const dbRes = await pool.query('SELECT url_key FROM api_keys_vault WHERE provider = $1', [provider]);
            baseUrl = dbRes.rows[0]?.url_key;
        }
        if (baseUrl) {
            const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            try {
                const response = await fetch(`${cleanUrl}/models`, {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
                });
                if (response.ok) {
                    const data: any = await response.json();
                    models = (data.data || []).map((m: any) => ({ id: m.id, name: m.id }));
                } else {
                    console.warn(`[SyncCustom] Custom provider models fetch returned not ok (${response.status})`);
                }
            } catch (err) {
                console.error(`[SyncCustom] Error fetching models from ${cleanUrl}:`, err);
            }
        }

        // If models list is empty, inject standard compatible models for user flow robustness
        if (models.length === 0) {
            models = [
                { id: 'custom-model', name: 'Custom Standard Model' },
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Compatible)' },
                { id: 'gpt-4o', name: 'GPT-4o (Compatible)' },
                { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet (Compatible)' }
            ];
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

const vaultCache = new Map<string, string>();


export async function getProviderKey(provider: string): Promise<string | null> {
  const normProvider = provider.toLowerCase().replace(/\s+/g, '');
  
  if (vaultCache.has(normProvider)) {
    return vaultCache.get(normProvider)!;
  }

  let decryptedKey: string | null = null;
  try {
    const result = await pool.query('SELECT encrypted_key FROM api_keys_vault WHERE provider = $1', [normProvider]);
    if (result.rows.length > 0 && result.rows[0].encrypted_key) {
      decryptedKey = decrypt(result.rows[0].encrypted_key);
    }
  } catch (_) {}

  if (!decryptedKey && (normProvider === 'google' || normProvider === 'gemini') && process.env.GEMINI_API_KEY) {
    decryptedKey = process.env.GEMINI_API_KEY.trim();
  }

  if (decryptedKey) {
    vaultCache.set(normProvider, decryptedKey);
    return decryptedKey;
  }

  return null;
}


export function invalidateVaultCache(provider?: string) {
  if (provider) {
    vaultCache.delete(provider.toLowerCase());
  } else {
    vaultCache.clear();
  }
}

export async function checkProviderStatus(provider: string, apiKey: string, urlKey?: string) {
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
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
                headers: { 'x-goog-api-key': apiKey }
            });
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
            const cleanUrl = cleanOllamaUrl(urlKey || '');
            const targetHeaders: any = { 'Accept': 'application/json' };
            let keyToUse = apiKey || '';
            if (urlKey && keyToUse.startsWith(urlKey)) {
                keyToUse = keyToUse.substring(urlKey.length);
                if (keyToUse.startsWith(':')) {
                    keyToUse = keyToUse.substring(1);
                }
            }
            if (keyToUse && keyToUse.trim() !== '' && !keyToUse.includes('http')) {
                targetHeaders['Authorization'] = `Bearer ${keyToUse}`;
            }
            try {
                let res = await fetch(`${cleanUrl}/api/tags`, { headers: targetHeaders });
                if (!res.ok && (res.status === 401 || res.status === 403) && targetHeaders['Authorization']) {
                    const headersNoAuth = { ...targetHeaders };
                    delete headersNoAuth['Authorization'];
                    res = await fetch(`${cleanUrl}/api/tags`, { headers: headersNoAuth });
                }
                status.isValid = res.ok;
                if (!res.ok) {
                    status.message = `Ollama: Connection failed (${res.status}): ${res.statusText}`;
                }
            } catch (err: any) {
                status.isValid = false;
                status.message = `Ollama: Failed to connect to ${cleanUrl} (${err.message})`;
            }
        } else {
            // General OpenAI-compatible custom provider check
            let baseUrl = urlKey;
            if (!baseUrl) {
                const dbRes = await pool.query('SELECT url_key FROM api_keys_vault WHERE provider = $1', [normProvider]);
                baseUrl = dbRes.rows[0]?.url_key;
            }
            if (baseUrl) {
                const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
                try {
                    const res = await fetch(`${cleanUrl}/models`, {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    });
                    
                    status.isValid = res.ok;
                    if (!res.ok) {
                        status.message = `Custom Provider Connection failed (${res.status}): ${res.statusText}`;
                        // Robust check: some setups allow completions but hide /models
                        if (res.status === 404 || res.status === 405 || res.status === 403 || res.status === 401) {
                            status.isValid = true;
                            status.message = `Warning: Models endpoint returned ${res.status}, but provider accepts completions using fallback model lists.`;
                        } else {
                            // Let custom providers remain valid so they can be saved, but issue a warning
                            status.isValid = true;
                            status.message = `Warning: Base URL endpoint validation failed (${res.status}). Key saved anyway.`;
                        }
                    }
                } catch (fetchErr: any) {
                    // Let custom providers remain valid so they can be saved, but issue a warning
                    status.isValid = true;
                    status.message = `Warning: Custom provider endpoint unreachable: ${fetchErr.message}. Custom provider key saved without live validation.`;
                }
            } else {
                // If no Base URL is configured, skip verification to allow flexible local/fallback usage
                status.isValid = true;
                status.message = 'Warning: No API Base URL provided. Verification skipped. Please configure base URL to fetch models dynamically.';
            }
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

  // Strip provider prefix if present (e.g., "google/gemini-1.5-pro" -> "gemini-1.5-pro")
  let cleanModel = model;
  if (cleanModel.includes('/') && !cleanModel.startsWith('models/')) {
    const parts = cleanModel.split('/');
    if (parts[0].toLowerCase() === normProvider || parts[0].toLowerCase() === 'google' || parts[0].toLowerCase() === 'openai') {
      cleanModel = parts.slice(1).join('/');
    }
  }

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
       let errorText = '';
       let extractedMessage = '';
       try {
         const errorJson = await response.json();
         errorText = JSON.stringify(errorJson);
         extractedMessage = errorJson.error?.message || errorJson.message || errorJson.error || '';
       } catch (e) {
         try {
           errorText = await response.text();
         } catch (_) {}
       }
       console.error(`[AI Service] Provider Error (${response.status}) for ${normProvider}/${cleanModel}: ${errorText.substring(0, 300)}`);
       
       const baseErrorMessage = extractedMessage 
         ? `The AI provider encountered an issue (${response.status}): ${extractedMessage}`
         : `The AI provider encountered an issue (${response.status}). Please check your API keys or fallback to another model.`;
         
       throw new Error(baseErrorMessage);
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
          if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.substring(trimmedLine.startsWith('data: ') ? 6 : 5).trim();
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
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
      return resultText;
    } else {
      const data = await response.json();
      if (normProvider === 'anthropic') return data.content?.[0]?.text || '';
      if (normProvider.includes('google') || normProvider.includes('gemini')) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text && data.error) throw new Error(`Google AI Error: ${data.error.message || 'Unknown error'}`);
        return text || '';
      }
      return data.choices?.[0]?.message?.content || '';
    }
  }

  let url = '';
  let headers: any = { 'Content-Type': 'application/json' };
  let body: any = {};

  if (normProvider === 'openai' || normProvider === 'deepseek' || normProvider === 'together' || normProvider === 'openrouter' || normProvider === 'xai' || normProvider === 'grok') {
    if (normProvider === 'openai') url = 'https://api.openai.com/v1/chat/completions';
    else if (normProvider === 'deepseek') url = 'https://api.deepseek.com/chat/completions';
    else if (normProvider === 'together') url = 'https://api.together.xyz/v1/chat/completions';
    else if (normProvider === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';
    else if (normProvider === 'xai' || normProvider === 'grok') url = 'https://api.x.ai/v1/chat/completions';
    
    headers['Authorization'] = `Bearer ${cleanApiKey}`;
    body = { model: cleanModel, messages: processedMessages, stream: isStreaming };
  } else if (normProvider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers['x-api-key'] = cleanApiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = { model: cleanModel, max_tokens: 4096, stream: isStreaming, messages: processedMessages.filter(m => m.role !== 'system') };
    if (systemPrompt) body.system = systemPrompt;
  } else if (normProvider.includes('google') || normProvider.includes('gemini')) {
    const method = isStreaming ? 'streamGenerateContent' : 'generateContent';
    let modelPath = cleanModel;
    if (!modelPath.startsWith('models/')) {
      modelPath = `models/${modelPath}`;
    }
    url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:${method}`;
    if (isStreaming) url += '?alt=sse';
    headers['x-goog-api-key'] = cleanApiKey;
    body = { 
      contents: processedMessages.filter(m => m.role !== 'system').map(m => ({ 
        role: m.role === 'assistant' ? 'model' : 'user', 
        parts: Array.isArray(m.content) ? m.content.map((c: any) => ({ text: c.text || c.data })) : [{ text: String(m.content) }] 
      })) 
    };
    if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };
  } else if (normProvider === 'ollama') {
    let baseUrl = '';
    const dbRes = await pool.query('SELECT url_key FROM api_keys_vault WHERE provider = $1', [normProvider]);
    if (dbRes.rows.length > 0 && dbRes.rows[0].url_key) {
      baseUrl = dbRes.rows[0].url_key;
    }
    const cleanUrl = cleanOllamaUrl(baseUrl);
    url = `${cleanUrl}/api/chat`;
    if (cleanApiKey && cleanApiKey.trim() !== '' && !cleanApiKey.includes('http')) {
      headers['Authorization'] = `Bearer ${cleanApiKey}`;
    }
    body = { model: cleanModel, messages: processedMessages, stream: isStreaming };
  } else {
    // Default to OpenAI-style for unknown/custom providers
    let baseUrl = '';
    const dbRes = await pool.query('SELECT url_key FROM api_keys_vault WHERE provider = $1', [normProvider]);
    if (dbRes.rows.length > 0 && dbRes.rows[0].url_key) {
      baseUrl = dbRes.rows[0].url_key;
    }
    const cleanUrl = baseUrl ? (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl) : 'https://api.openai.com/v1';
    url = `${cleanUrl}/chat/completions`;
    headers['Authorization'] = `Bearer ${cleanApiKey}`;
    body = { model: cleanModel, messages: processedMessages, stream: isStreaming };
  }

  let res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok && normProvider === 'ollama' && (res.status === 401 || res.status === 403) && headers['Authorization']) {
    console.warn(`[AI Service] Ollama returned ${res.status} with Authorization header. Retrying without Authorization...`);
    const headersNoAuth = { ...headers };
    delete headersNoAuth['Authorization'];
    res = await fetch(url, { method: 'POST', headers: headersNoAuth, body: JSON.stringify(body) });
  }
  return handleResponse(res);
}
