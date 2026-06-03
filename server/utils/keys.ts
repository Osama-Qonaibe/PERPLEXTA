import crypto from 'crypto';

interface KeySet {
  privateKeyPem: string;
  publicKeyPem: string;
  jwk: {
    kty: string;
    use: string;
    alg: string;
    kid: string;
    n: string;
    e: string;
    [key: string]: any;
  };
}

let keysCache: KeySet | null = null;

export function getOrCreateSigningKeys(): KeySet {
  if (keysCache) {
    return keysCache;
  }

  try {
    // Generate a high-security RSA 2048 keypair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    // Obtain the JSON Web Key format natively
    const publicKeyObject = crypto.createPublicKey(publicKey);
    const jwk = publicKeyObject.export({ format: 'jwk' }) as any;

    jwk.kid = 'default-agent-key';
    jwk.use = 'sig';
    jwk.alg = 'RS256';

    keysCache = {
      privateKeyPem: privateKey,
      publicKeyPem: publicKey,
      jwk: {
        kty: jwk.kty || 'RSA',
        use: jwk.use || 'sig',
        alg: jwk.alg || 'RS256',
        kid: jwk.kid || 'default-agent-key',
        n: jwk.n || '',
        e: jwk.e || 'AQAB'
      }
    };

    console.log('[KeysUtil] Successfully generated matching RS256 signing key pair.');
    return keysCache;
  } catch (error) {
    console.error('[KeysUtil] RSA key pair generation error, fallback configured:', error);
    const fallbackJwk = {
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
      kid: 'default-agent-key',
      n: '0vx7agoebGcQSuuPiLJXZ5IZN_tX7N_t',
      e: 'AQAB'
    };
    return {
      privateKeyPem: '',
      publicKeyPem: '',
      jwk: fallbackJwk
    };
  }
}
