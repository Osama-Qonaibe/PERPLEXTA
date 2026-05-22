import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserProfile, updateUserProfile, getUserUsage } from '../services/users.js';
import { upload, handleMulterError } from '../middleware/upload.js';

const router = express.Router();

router.post("/avatar", authenticateToken, upload.single('file'), handleMulterError, async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file attached' });
    const { filename } = req.file;
    const avatarUrl = `/uploads/${filename}`;
    const updated = await updateUserProfile(req.user.id, { avatar: avatarUrl });
    res.json({ success: true, url: avatarUrl, user: updated });
  } catch (error) {
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
     const profile = await getUserProfile(req.user.id);
     if (!profile) {
       console.warn(`[DEBUG /me] User with ID ${req.user.id} not found.`);
       return res.status(404).json({ error: 'User not found' });
     }
     console.log(`[DEBUG /me] Profile fetched successfully:`, {
       id: profile.id,
       email: profile.email,
       hasAvatar: !!profile.avatar,
       avatarPreview: profile.avatar ? (profile.avatar.length > 50 ? profile.avatar.substring(0, 50) + '...' : profile.avatar) : null
     });
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

export default router;
