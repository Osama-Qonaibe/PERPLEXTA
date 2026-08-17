const ENCRYPTION_KEY = 'perplexta_secure_key_32_chars_!!'; // Should match server-side key fallback

export async function encrypt(text: string): Promise<string> {
  const enc = new TextEncoder();
  
  // Use SHA-256 to derive the key buffer, matching the backend's crypto.createHash('sha256')
  const keyBuffer = await window.crypto.subtle.digest('SHA-256', enc.encode(ENCRYPTION_KEY));
  
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  );
  
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    enc.encode(text)
  );
  
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const encryptedHex = Array.from(new Uint8Array(encrypted)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return ivHex + ':' + encryptedHex;
}
