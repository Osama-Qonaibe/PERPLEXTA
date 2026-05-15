import crypto from 'crypto';

const DEFAULT_KEY = 'sovereign_secure_key_32_chars_!!';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || DEFAULT_KEY; 
const IV_LENGTH = 16;

function getSecretBuffer(key: string) {
  return Buffer.from(key.padEnd(32, '0').slice(0, 32));
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
  
  const performDecryption = (cipherText: string, secretKey: string): string | null => {
    try {
      const textParts = cipherText.split(':');
      const ivHex = textParts.shift();
      const encryptedHex = textParts.join(':');
      
      if (!ivHex || !encryptedHex) return null;

      const iv = Buffer.from(ivHex, 'hex');
      const encryptedText = Buffer.from(encryptedHex, 'hex');
      
      if (iv.length !== IV_LENGTH || encryptedText.length === 0) return null;

      const decipher = crypto.createDecipheriv(
        'aes-256-cbc', 
        getSecretBuffer(secretKey), 
        iv
      );
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (err) {
      return null;
    }
  };

  const primaryResult = performDecryption(text, ENCRYPTION_KEY);
  if (primaryResult !== null) return primaryResult;

  if (ENCRYPTION_KEY !== DEFAULT_KEY) {
    const fallbackResult = performDecryption(text, DEFAULT_KEY);
    if (fallbackResult !== null) return fallbackResult;
  }
  
  if (text.includes('/') || text.includes('@') || text.includes('://')) {
    return text;
  }

  return '';
}
