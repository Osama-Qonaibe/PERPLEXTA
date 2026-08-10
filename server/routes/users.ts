import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserProfile, updateUserProfile, getUserUsage } from '../services/users.js';
import { upload, handleMulterError } from '../middleware/upload.js';
import { uploadValidator } from '../middleware/uploadValidator.js';
import { optimizeUploadedImage, normalizeMediaUrl } from '../services/mediaOptimizationService.js';
import { walletLoader } from '../db/queries.js';

const router = express.Router();

router.post("/avatar", authenticateToken, upload.single('file'), handleMulterError, uploadValidator, async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file attached' });
    const optResult = await optimizeUploadedImage(req.file.path, req.file.originalname);
    
    const optimizedPath = path.join(process.cwd(), optResult.fileUrl.replace(/^\//, ''));
    const fileBuffer = await fs.readFile(optimizedPath);
    const avatarUrl = `data:image/${optResult.format || 'webp'};base64,${fileBuffer.toString('base64')}`;
    
    // Cleanup local files
    await fs.unlink(req.file.path).catch(() => {});
    await fs.unlink(optimizedPath).catch(() => {});
    const updated = await updateUserProfile(req.user.id, { avatar: avatarUrl });
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

export default router;
