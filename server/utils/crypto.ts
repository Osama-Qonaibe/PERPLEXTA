import crypto from 'crypto';

const rawKey = process.env.ENCRYPTION_KEY || 'perplexta_secure_key_32_chars_!!';
// Safety check: If the key looks like a DB URL or is too long/short, use fallback
const ENCRYPTION_KEY = (rawKey.startsWith('postgres') || rawKey.startsWith('http') || rawKey.length > 200) 
  ? 'perplexta_secure_key_32_chars_!!' 
  : rawKey;

const IV_LENGTH = 16;

function getSecretBuffer(key: string) {
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc', 
    getSecretBuffer(ENCRYPTION_KEY), 
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  if (!text) return '';
  
  const encryptedPattern = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;
  if (!encryptedPattern.test(text)) {
    return text.length > 5000 ? '' : text;
  }
  
  try {
    const textParts = text.split(':');
    const ivHex = textParts.shift();
    const encryptedHex = textParts.join(':');
    
    if (!ivHex || !encryptedHex) return text;

    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    
    if (iv.length !== IV_LENGTH || encryptedText.length === 0) return text;

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      getSecretBuffer(ENCRYPTION_KEY), 
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return text;
  }
}
