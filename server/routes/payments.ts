import express from 'express';
import { getStripe, getWebhookSecret } from '../services/payments.js';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../db/index.js';

const router = express.Router();

router.post("/stripe-checkout", authenticateToken, async (req: any, res) => {
  try {
    const { planId } = req.body;
    const stripe = await getStripe();
    if (!stripe) return res.status(400).json({ error: 'Payments not configured' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: 'Sovereign Plan' }, unit_amount: 2000 }, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/success`,
      cancel_url: `${process.env.APP_URL}/cancel`,
      metadata: { userId: req.user.id, planId }
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = await getStripe();
  const webhookSecret = getWebhookSecret();
  if (!stripe || !webhookSecret) return res.status(400).send('Webhook unconfigured');

  const sig = req.headers['stripe-signature'] as string;
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    // Handle event...
    res.json({ received: true });
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

export default router;
