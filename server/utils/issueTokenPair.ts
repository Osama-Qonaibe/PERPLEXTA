import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Access token lifetime — 4 hours prevents frequent silent refreshes
export const ACCESS_TOKEN_EXPIRY = '4h';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  rememberMe: boolean;
}

export interface TokenPairUser {
  id: number;
  email: string;
  role: string;
}

/**
 * Issues a signed access + refresh token pair for the given user.
 * Centralises all jwt.sign calls that were duplicated across
 * signup / login / refresh-token / google-callback.
 *
 * @param user      - Minimal user fields embedded in the JWT payload
 * @param remember  - When true the refresh token lives 30 days, else 1 day
 * @param secret    - The JWT_SECRET to sign with
 * @returns         - { accessToken, refreshToken, rememberMe }
 */
export function issueTokenPair(
  user: TokenPairUser,
  remember: boolean,
  secret: string
): TokenPair {
  const base = { id: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(
    { ...base, type: 'access', jti: crypto.randomUUID() },
    secret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { ...base, remember, type: 'refresh', jti: crypto.randomUUID() },
    secret,
    { expiresIn: remember ? '30d' : '1d' }
  );

  return { accessToken, refreshToken, rememberMe: remember };
}

/**
 * Parses the `remember` flag from request body / decoded token.
 * Accepts boolean true or the string "true".
 */
export function parseRemember(value: unknown): boolean {
  return value === true || value === 'true';
}
