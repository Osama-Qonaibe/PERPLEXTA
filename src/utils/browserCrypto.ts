export const ENCRYPTION_KEY = 'perplexta_secure_key_32_chars_!!'; // Should match server-side key

export async function encrypt(text: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)),
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
