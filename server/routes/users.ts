import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserProfile, updateUserProfile, getUserUsage } from '../services/users.js';

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

export default router;
