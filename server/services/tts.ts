export async function perplextaTTS(text: string, voiceId: string = 'standard') {
  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) throw new Error('ElevenLabs API Key is missing.');

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
        model_id: 'eleven_monolingual_v1',
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
