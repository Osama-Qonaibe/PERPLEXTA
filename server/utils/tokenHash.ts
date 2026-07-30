import crypto from 'crypto';

/**
 * SHA-256 high-integrity token hashing utility to protect user sessions
 * and prevent raw token disclosure in security logs and database breaches.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};
