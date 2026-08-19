import { getProviderKey } from './ai.js';

export async function perplextaTTS(text: string, voiceId: string, modelId: string, providerId: string) {
  const apiKey = await getProviderKey(providerId);
  if (!apiKey) throw new Error(`TTS Orchestrator: API Key for provider '${providerId}' is missing from the vault.`);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: { stability: 0.5, similarity_boost: 0.5 }
      })
    });

    if (!response.ok) {
      throw new Error(`TTS Error (${response.status})`);
    }

    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer);
  } catch (error: any) {
    console.error('[TTS] Error:', error.message);
    throw error;
  }
}
