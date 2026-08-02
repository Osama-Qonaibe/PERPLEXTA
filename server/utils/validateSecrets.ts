/**
 * Perplexta Secure Secret Validator
 * Validates that critical security secrets (ENCRYPTION_KEY and JWT_SECRET)
 * are present and meet the minimum length requirement (32 characters).
 * Prevents server startup with clear, actionable logs if validation fails.
 */

export function validateRequiredSecrets(): void {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const jwtSecret = process.env.JWT_SECRET;

  const errors: string[] = [];

  if (!encryptionKey) {
    errors.push('[SECURITY ERROR] ENCRYPTION_KEY environment variable is missing.');
  } else if (encryptionKey.length < 32) {
    errors.push(`[SECURITY ERROR] ENCRYPTION_KEY is too short (${encryptionKey.length} chars). Minimum required length is 32 characters for AES-256 security.`);
  }

  if (!jwtSecret) {
    errors.push('[SECURITY ERROR] JWT_SECRET environment variable is missing.');
  } else if (jwtSecret.length < 32) {
    errors.push(`[SECURITY ERROR] JWT_SECRET is too short (${jwtSecret.length} chars). Minimum required length is 32 characters for session integrity.`);
  }

  if (errors.length > 0) {
    console.error('\n========================================================================');
    console.error('🔴 PERPLEXTA SECURITY FATAL: Critical Security Secrets Validation Failed');
    console.error('========================================================================');
    errors.forEach(err => console.error(err));
    console.error('\nPlease configure valid 32+ character secrets in your .env file or environment.');
    console.error('Example format in .env.example:');
    console.error('  ENCRYPTION_KEY="your_secure_32_chars_master_key_here_!"');
    console.error('  JWT_SECRET="your_secure_32_chars_jwt_secret_here_!"');
    console.error('========================================================================\n');
    process.exit(1);
  }

  console.log('[SECURITY SUCCESS] ENCRYPTION_KEY and JWT_SECRET validated successfully (32+ characters).');
}
