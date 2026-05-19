import express from 'express';
import { getStripe, getWebhookSecret } from '../services/payments.js';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../db/index.js';
import { activateStripeSubscription, cancelSubscription } from '../services/subscriptions.js';

const router = express.Router();

router.post("/stripe-checkout", authenticateToken, async (req: any, res) => {
  try {
    const { planId, billingCycle } = req.body;
    const stripe = await getStripe();
    if (!stripe) return res.status(400).json({ error: 'Payments not configured' });

    const planRes = await pool.query('SELECT * FROM plans WHERE id = $1', [planId]);
    if (planRes.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    const plan = planRes.rows[0];

    const price = billingCycle === 'annual' ? Number(plan.annual_price) : Number(plan.monthly_price);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ 
        price_data: { 
          currency: 'usd', 
          product_data: { 
            name: `Perplexta - ${plan.name_en}`,
            description: `Subscription: ${billingCycle}`
          }, 
          unit_amount: Math.round(price * 100) 
        }, 
        quantity: 1 
      }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/success`,
      cancel_url: `${process.env.APP_URL}/cancel`,
      metadata: { 
        userId: req.user.id.toString(), 
        planId: planId.toString(),
        billingCycle: billingCycle
      }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe] Checkout error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = await getStripe();
  const webhookSecret = getWebhookSecret();
  if (!stripe || !webhookSecret) return res.status(400).send('Webhook unconfigured');

  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`[Stripe] Webhook signature verification failed: ${err.message}`);
    return res.status(400).send('Webhook signature invalid');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const { userId, planId, billingCycle } = session.metadata;
        if (userId && planId) {
          await activateStripeSubscription(userId, planId, session.subscription, billingCycle || 'monthly');
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await cancelSubscription(userId);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const userId = invoice.subscription_details?.metadata?.userId || invoice.metadata?.userId;
        if (userId) {
          await cancelSubscription(userId);
        }
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error(`[Stripe] Webhook processing error: ${err.message}`);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
