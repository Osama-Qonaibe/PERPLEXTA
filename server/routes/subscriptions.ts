import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { purchaseSubscription, getSubscriptionStatus } from '../services/subscriptions.js';

const router = express.Router();

router.post("/pay-with-balance", authenticateToken, async (req: any, res) => {
  try {
    const { planId, billingCycle } = req.body;
    const userId = req.user.id;
    const result = await purchaseSubscription(userId, planId, billingCycle);
    res.json(result);
  } catch (error: any) {
    console.error('[Subscriptions] Payment Route Error:', error);
    const status = error.message === 'Insufficient balance' ? 400 : 500;
    res.status(status).json({ error: error.message || 'Failed to process payment' });
  }
});

router.get("/status", authenticateToken, async (req: any, res) => {
  try {
    const status = await getSubscriptionStatus(req.user.id);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;
