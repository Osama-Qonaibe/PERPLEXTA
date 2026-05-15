import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool, safeQuery } from '../db/index.js';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
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
        console.error(`[Auth] JWT Error: ${err.name}`);
        res.status(403).json({ error: 'Forbidden', message: 'Token verification failed' });
        return;
      }

      try {
        const blacklistCheck = await safeQuery('SELECT id FROM token_blacklist WHERE token = $1', [token]);
        if (blacklistCheck.rows.length > 0) {
          res.status(401).json({ error: 'Unauthorized', message: 'Token has been revoked/logged out' });
          return;
        }
      } catch (checkErr) {
        console.error('[Auth] Blacklist check failed:', checkErr instanceof Error ? checkErr.message : checkErr);
        res.status(503).json({ error: 'Service temporarily unavailable' });
        return;
      }

      const userPayload = user as any;

      try {
        const userCheck = await safeQuery('SELECT status, role FROM users WHERE id = $1', [userPayload.id]);
        if (userCheck.rows.length === 0) {
          res.status(401).json({ error: 'User not found' });
          return;
        }

        if (userCheck.rows[0].status === 'suspended') {
          res.status(403).json({
            error: 'Account Suspended',
            message: 'Your account has been suspended by the administration. Please contact support.'
          });
          return;
        }

        userPayload.role = userCheck.rows[0].role;
      } catch (dbErr) {
        console.error('[Security] Failed to verify user status:', dbErr);
        res.status(503).json({ error: 'Service temporarily unavailable' });
        return;
      }

      (req as any).user = userPayload;
      (req as any).token = token;

      safeQuery('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [userPayload.id])
        .catch((e: any) => console.error('Error updating last_active_at:', e));

      next();
    });
  } catch (error) {
    console.error('Auth Token Error:', error);
    res.status(500).json({ error: 'Internal Server Error in Auth' });
  }
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