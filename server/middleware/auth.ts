import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import { tokenLimiter } from './rateLimit.js';

// In-memory caching for performance & DB optimization
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

const USER_CACHE_TTL = 30 * 1000; // 30 seconds
const BLACKLIST_CACHE_TTL = 60 * 1000; // 60 seconds

export function invalidateUserCache(userId: string | number) {
  userStatusCache.delete(userId);
}

export function addToBlacklistCache(token: string) {
  tokenBlacklistCache.set(token, {
    isRevoked: true,
    expiryTime: Date.now() + 24 * 60 * 60 * 1000 // Lock in memory for 24 hours
  });
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  // Execute token rate limiter check to prevent brute-forcing token signatures
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
          if (err.name === 'TokenExpiredError') {
            console.warn(`[Auth] JWT Token Expired`);
            res.status(401).json({ error: 'TokenExpiredError', message: 'Token has expired' });
          } else {
            console.error(`[Auth] JWT Error: ${err.name}`);
            res.status(403).json({ error: 'Forbidden', message: 'Token verification failed' });
          }
          return;
        }

        const nowMs = Date.now();

        // 1. Blacklist Check (with performance caching)
        const cachedBlacklist = tokenBlacklistCache.get(token);
        if (cachedBlacklist && cachedBlacklist.expiryTime > nowMs) {
          if (cachedBlacklist.isRevoked) {
            res.status(401).json({ error: 'Unauthorized', message: 'Token has been revoked/logged out' });
            return;
          }
        } else {
          try {
            const blacklistCheck = await pool.query('SELECT id FROM token_blacklist WHERE token = $1', [token]);
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

        // 2. User Status & Role Check (with performance caching)
        let userData: any = null;
        const cachedUser = userStatusCache.get(userPayload.id);

        if (cachedUser && cachedUser.expiryTime > nowMs) {
          userData = {
            status: cachedUser.status,
            role: cachedUser.role,
            last_active_at: new Date(cachedUser.lastActiveAtVal)
          };
        } else {
          try {
            const userCheck = await pool.query('SELECT status, role, last_active_at FROM users WHERE id = $1', [userPayload.id]);
            if (userCheck.rows.length === 0) {
              res.status(401).json({ error: 'User not found' });
              return;
            }

            userData = userCheck.rows[0];
            userStatusCache.set(userPayload.id, {
              status: userData.status,
              role: userData.role,
              lastActiveAtVal: userData.last_active_at ? new Date(userData.last_active_at).getTime() : 0,
              expiryTime: nowMs + USER_CACHE_TTL
            });
          } catch (dbErr) {
            console.error('[Security] Failed to verify user status:', dbErr);
            res.status(503).json({ error: 'Service temporarily unavailable' });
            return;
          }
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