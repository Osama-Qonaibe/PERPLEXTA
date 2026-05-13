import express from 'express';
import path from 'path';
import { authenticateToken } from '../middleware/auth.js';
import { upload, handleMulterError } from '../middleware/upload.js';
import { getUserProfile, updateUserProfile, getUserUsage } from '../services/users.js';
import { pool } from '../db/index.js';

const router = express.Router();

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

router.post("/avatar", authenticateToken, upload.single('file'), handleMulterError, async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file attached' });

    const { mimetype, size, filename } = req.file;

    if (!mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
    if (size > MAX_AVATAR_SIZE) {
      return res.status(400).json({ error: 'Image exceeds 5MB limit' });
    }

    const avatarUrl = `/uploads/${filename}`;
    await pool.query(
      'UPDATE users SET avatar = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [avatarUrl, req.user.id]
    );

    res.json({ url: avatarUrl });
  } catch (error) {
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

export default router;
