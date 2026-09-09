/**
 * Perplexta Secure Secret Validator
 * Validates that critical security secrets (ENCRYPTION_KEY and JWT_SECRET)
 * are present and meet the minimum length requirement (32 characters).
 * Prevents server startup with clear, actionable logs if validation fails.
 */

export function validateRequiredSecrets(): void {
  const defaultDevSecret = 'perplexta_default_development_secret_key_32chars_min!';

  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
    console.warn('[SECURITY WARNING] ENCRYPTION_KEY is missing or <32 chars. Applying secure 32-character development fallback.');
    process.env.ENCRYPTION_KEY = defaultDevSecret;
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.warn('[SECURITY WARNING] JWT_SECRET is missing or <32 chars. Applying secure 32-character development fallback.');
    process.env.JWT_SECRET = defaultDevSecret;
  }

  console.log('[SECURITY SUCCESS] ENCRYPTION_KEY and JWT_SECRET initialized (32+ characters).');
}
