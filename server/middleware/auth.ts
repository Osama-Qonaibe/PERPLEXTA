import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool, getSecurityPool } from '../db/index.js';
import { tokenLimiter } from './rateLimit.js';
import { getOrCreateSigningKeys } from '../utils/keys.js';
import { hashToken } from '../utils/tokenHash.js';
import { userLoader } from '../db/queries.js';

interface UserCacheEntry {
  status: string;
  role: string;
  lastActiveAtVal: number;
  expiryTime: number;
}

interface RevocationCacheEntry {
  isRevoked: boolean;
  expiryTime: number;
}

const userStatusCache = new Map<string | number, UserCacheEntry>();
const tokenBlacklistCache = new Map<string, RevocationCacheEntry>();

const USER_CACHE_TTL = 30 * 1000;
const BLACKLIST_CACHE_TTL = 60 * 1000;

export function invalidateUserCache(userId: string | number) {
  userStatusCache.delete(userId);
  userLoader.clear(userId);
}

export function addToBlacklistCache(token: string) {
  tokenBlacklistCache.set(token, {
    isRevoked: true,
    expiryTime: Date.now() + 24 * 60 * 60 * 1000
  });
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  tokenLimiter(req, res, (limiterErr?: any) => {
    if (limiterErr) {
      return next(limiterErr);
    }

    try {
      const authHeader = req.headers['authorization'];
      let token = authHeader && authHeader.split(' ')[1];

      if (token) {
        token = token.trim();
        if (token.startsWith('"') && token.endsWith('"')) {
          token = token.slice(1, -1);
        }
      }

      if (token === 'null' || token === 'undefined' || token === '') {
        token = undefined;
      }

      if (!token) {
        res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
        return;
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('[FATAL] JWT_SECRET environment variable is missing.');
        res.status(500).json({ error: 'Internal Server Error', message: 'Security misconfiguration' });
        return;
      }

      jwt.verify(token, jwtSecret, async (err: any, user: any) => {
        if (err) {
          try {
            const { publicKeyPem } = getOrCreateSigningKeys();
            if (publicKeyPem) {
              const agentPayload = jwt.verify(token, publicKeyPem, { algorithms: ['RS256'] }) as any;
              if (agentPayload && (agentPayload.client_id || agentPayload.sub)) {
                const clientId = agentPayload.client_id || agentPayload.sub;
                const agentCheck = await getSecurityPool().query('SELECT * FROM registered_agents WHERE client_id = $1', [clientId]);
                if (agentCheck.rows.length > 0) {
                  const agent = agentCheck.rows[0];
                  if (agent.is_active === false) {
                    res.status(403).json({ error: 'Forbidden', message: 'Agent registration is inactive' });
                    return;
                  }
                  const resolvedIdentityType = agent.identity_type || agentPayload.identity_type || agentPayload.id_type || 'agent';
                  (req as any).user = {
                    id: agent.id,
                    name: agent.client_name,
                    id_type: resolvedIdentityType,
                    identity_type: resolvedIdentityType,
                    role: agentPayload.role || 'agent',
                    isAgent: true,
                    client_id: agent.client_id
                  };
                  (req as any).token = token;
                  return next();
                }
              }
            }
          } catch (rsaErr) {
          }

          if (err.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'TokenExpiredError', message: 'Token has expired' });
          } else {
            console.error(`[Auth] JWT Error: ${err.name}`);
            res.status(403).json({ error: 'Forbidden', message: 'Token verification failed' });
          }
          return;
        }

        const nowMs = Date.now();

        const cachedBlacklist = tokenBlacklistCache.get(token);
        if (cachedBlacklist && cachedBlacklist.expiryTime > nowMs) {
          if (cachedBlacklist.isRevoked) {
            res.status(401).json({ error: 'Unauthorized', message: 'Token has been revoked/logged out' });
            return;
          }
        } else {
          try {
            let blacklistCheck;
            try {
              blacklistCheck = await getSecurityPool().query('SELECT id FROM token_blacklist WHERE token = $1', [hashToken(token)]);
            } catch (secErr) {
              console.warn('[Auth] Security DB blacklist check failed, trying core pool fallback:', secErr instanceof Error ? secErr.message : secErr);
              if (pool && getSecurityPool() !== pool) {
                blacklistCheck = await pool.query('SELECT id FROM token_blacklist WHERE token = $1', [hashToken(token)]);
              } else {
                throw secErr;
              }
            }
            const isRevoked = blacklistCheck.rows.length > 0;
            tokenBlacklistCache.set(token, {
              isRevoked,
              expiryTime: nowMs + BLACKLIST_CACHE_TTL
            });
            if (isRevoked) {
              res.status(401).json({ error: 'Unauthorized', message: 'Token has been revoked/logged out' });
              return;
            }
          } catch (checkErr) {
            console.error('[Auth] Blacklist check failed:', checkErr instanceof Error ? checkErr.message : checkErr);
            res.status(503).json({ error: 'Service temporarily unavailable' });
            return;
          }
        }

        const userPayload = user as any;
        if (userPayload.type === 'refresh') {
          res.status(401).json({ error: 'Unauthorized', message: 'Refresh token cannot be used as an access token' });
          return;
        }

        if (userPayload.isAgent || userPayload.role === 'agent' || userPayload.client_id) {
          const clientId = userPayload.client_id || userPayload.sub;
          if (clientId) {
            const agentCheck = await getSecurityPool().query('SELECT * FROM registered_agents WHERE client_id = $1', [clientId]);
            if (agentCheck.rows.length > 0) {
              const agent = agentCheck.rows[0];
              if (agent.is_active === false) {
                res.status(403).json({ error: 'Forbidden', message: 'Agent registration is inactive' });
                return;
              }
              const resolvedIdentityType = agent.identity_type || userPayload.identity_type || userPayload.id_type || 'agent';
              (req as any).user = {
                id: agent.id,
                name: agent.client_name,
                id_type: resolvedIdentityType,
                identity_type: resolvedIdentityType,
                role: 'agent',
                isAgent: true,
                client_id: agent.client_id
              };
              (req as any).token = token;
              return next();
            }
          }
        }

        let userData: any = null;
        try {
          userData = await userLoader.load(userPayload.id);
          if (!userData) {
            res.status(401).json({ error: 'User not found' });
            return;
          }
        } catch (dbErr) {
          console.error('[Security] Failed to verify user status via userLoader:', dbErr);
          res.status(503).json({ error: 'Service temporarily unavailable' });
          return;
        }

        if (userData.status === 'suspended') {
          res.status(403).json({
            error: 'Account Suspended',
            message: 'Your account has been suspended by the administration. Please contact support.'
          });
          return;
        }

        userPayload.role = userData.role;

        const lastActive = userData.last_active_at ? new Date(userData.last_active_at).getTime() : 0;
        if (nowMs - lastActive > 5 * 1000 * 60) {
          pool.query('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [userPayload.id])
            .catch((e: any) => console.error('Error updating last_active_at:', e));

          pool.query("UPDATE user_sessions SET last_active_at = CURRENT_TIMESTAMP WHERE session_token = $1 AND status = 'active'", [token])
            .catch((e: any) => console.error('Error updating user_sessions last_active_at:', e));
        }

        (req as any).user = userPayload;
        (req as any).token = token;
        next();
      });
    } catch (error) {
      console.error('Auth Token Error:', error);
      res.status(500).json({ error: 'Internal Server Error in Auth' });
    }
  });
};


export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  authenticateToken(req, res, () => {
    const userPayload = (req as any).user;
    if (!userPayload || userPayload.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
};
export const authenticateTokenOptional = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (token) {
    token = token.trim();
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1);
    }
  }
  if (!token || token === 'null' || token === 'undefined' || token === '') {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next();
  }

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (!err) {
      (req as any).user = user;
      (req as any).token = token;
    }
    next();
  });
};
