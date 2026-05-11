import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Auth] Request: ${req.method} ${req.url}`);
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      console.warn(`[Auth] No token provided for ${req.method} ${req.url}`);
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    jwt.verify(token, process.env.JWT_SECRET as string, async (err: any, user: any) => {
      if (err) {
        console.error(`[Auth] JWT Verification Error for ${req.url}:`, err.message);
        res.status(403).json({ error: 'Forbidden', message: err.message });
        return;
      }
      const userPayload = user as any;
      
      try {
        const userCheck = await pool.query('SELECT status, role FROM users WHERE id = $1', [userPayload.id]);
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

        // Update user payload with actual role from DB to ensure real-time accuracy
        userPayload.role = userCheck.rows[0].role;
      } catch (dbErr) {
        console.error('[Security] Failed to verify user status:', dbErr);
      }

      (req as any).user = userPayload;
      
      if (userPayload && userPayload.id) {
        pool.query('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [userPayload.id])
          .catch((e: any) => console.error('Error updating last_active_at:', e));
      }
      
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
    if (userPayload && userPayload.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  });
};
