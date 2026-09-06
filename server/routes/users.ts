import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserProfile, updateUserProfile, getUserUsage, getUserMediaPreferences, saveUserMediaPreference } from '../services/users.js';
import { upload, handleMulterError } from '../middleware/upload.js';
import { checkDiskSpace } from '../middleware/checkDiskSpace.js';
import { uploadValidator } from '../middleware/uploadValidator.js';
import { optimizeUploadedImage, normalizeMediaUrl } from '../services/mediaOptimizationService.js';
import { walletLoader } from '../db/queries.js';
import { pool, ledgerPool } from '../db/index.js';

const router = express.Router();

router.post("/avatar", authenticateToken, checkDiskSpace, upload.single('file'), handleMulterError, uploadValidator, async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file attached' });
    const optResult = await optimizeUploadedImage(req.file.path, req.file.originalname, 'avatar', true, { userId: req.user.id });
    const avatarUrl = normalizeMediaUrl(optResult.fileUrl);

    const updated = await updateUserProfile(req.user.id, { 
      avatar: avatarUrl,
      avatar_asset_id: optResult.assetId || null 
    });
    res.json({ success: true, url: avatarUrl, user: updated });
  } catch (error: any) {
    console.error('[AvatarUpload] Failed to process avatar:', error);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

router.get("/usage", authenticateToken, async (req: any, res) => {
   try {
     const usage = await getUserUsage(req.user.id);
     res.json(usage);
   } catch (error: any) {
     res.status(500).json({ error: 'Failed to fetch usage data' });
   }
});

router.get("/profile", authenticateToken, async (req: any, res) => {
   try {
     const profile = await getUserProfile(req.user.id);
     if (!profile) return res.status(404).json({ error: 'User not found' });
     res.json(profile);
   } catch (error: any) {
     if (error.message === 'Database initializing') {
       return res.status(503).json({ error: 'System is initializing, please try again shortly.' });
     }
     res.status(500).json({ error: 'Internal Error' });
   }
});

router.get("/me", authenticateToken, async (req: any, res) => {
   try {
     if (req.query.skip_profile === '1') {
       const wallet = await walletLoader.load(req.user.id) || { balance: 0.0, points: 0 };
       return res.json({
         balance: Number(wallet.balance || 0),
         points: parseInt(wallet.points || 0)
       });
     }
     const profile = await getUserProfile(req.user.id);
     if (!profile) return res.status(404).json({ error: 'User not found' });
     res.json(profile);
   } catch (error: any) {
     if (error.message === 'Database initializing') {
       return res.status(503).json({ error: 'System is initializing, please try again shortly.' });
     }
     res.status(500).json({ error: 'Internal Error' });
   }
});

router.put("/profile", authenticateToken, async (req: any, res) => {
  try {
    const updated = await updateUserProfile(req.user.id, req.body);
    res.json(updated);
  } catch (error: any) {
    if (error.message === 'Database initializing') {
      return res.status(503).json({ error: 'System is initializing, please try again shortly.' });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get("/media-preferences", authenticateToken, async (req: any, res) => {
  try {
    const prefs = await getUserMediaPreferences(req.user.id);
    res.json({ success: true, preferences: prefs });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch media preferences' });
  }
});

router.put("/media-preferences", authenticateToken, async (req: any, res) => {
  try {
    const { mediaType, aspectRatio, settings } = req.body;
    if (!mediaType || !aspectRatio) {
      return res.status(400).json({ error: 'mediaType and aspectRatio are required' });
    }
    const saved = await saveUserMediaPreference(req.user.id, mediaType, aspectRatio, settings || {});
    res.json({ success: true, preference: saved });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to save media preference' });
  }
});

router.delete("/account", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userRes = await client.query('SELECT role, email FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userRes.rows[0];
      const adminEmail = process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL;
      if (user.role === 'admin' && adminEmail && user.email === adminEmail) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Super Admin account cannot be deleted' });
      }

      // Clean up ledger if separate pool
      if (ledgerPool && ledgerPool !== pool) {
        await ledgerPool.query('DELETE FROM wallets WHERE user_id = $1', [userId]);
        await ledgerPool.query('DELETE FROM referrals WHERE referrer_id = $1 OR referred_id = $1', [userId]);
      } else {
        await client.query('DELETE FROM wallets WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM referrals WHERE referrer_id = $1 OR referred_id = $1', [userId]);
      }

      // Delete user (cascades to chats, messages, etc.)
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');
      res.json({ success: true, message: 'Account deleted successfully' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[User] Account self-deletion failed:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
