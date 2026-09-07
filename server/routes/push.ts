import { Router } from 'express';
import { pool } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Register/update a push token
router.post('/register', authenticateToken, async (req: any, res: any) => {
    try {
        const { token, platform, deviceName, appVersion } = req.body;
        
        if (!token || !platform) {
            return res.status(400).json({ 
                error: 'token and platform are required' 
            });
        }

        await pool.query(`
            INSERT INTO push_tokens (user_id, platform, token, device_name, app_version)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (token) 
            DO UPDATE SET 
                user_id = $1, 
                is_active = true,
                updated_at = NOW()
        `, [req.user.id, platform, token, deviceName || null, appVersion || null]);

        res.json({ success: true });
    } catch (error) {
        console.error('[PUSH] Register error:', error);
        res.status(500).json({ error: 'Failed to register token' });
    }
});

// Unregister (user logged out or app uninstalled)
router.delete('/unregister', authenticateToken, async (req: any, res: any) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        await pool.query(
            'UPDATE push_tokens SET is_active = false WHERE token = $1', 
            [token]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unregister' });
    }
});

export default router;
