import express from 'express';
import { getStripe, getWebhookSecret, createPayPalOrder, capturePayPalOrder } from '../services/payments.js';
import { authenticateToken } from '../middleware/auth.js';
import { pool, ledgerPool } from '../db/index.js';
import { activateStripeSubscription, cancelSubscription } from '../services/subscriptions.js';
import { depositToWallet } from '../services/wallet.js';

const router = express.Router();

router.post("/paypal-deposit", authenticateToken, async (req: any, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const returnUrl = `${appUrl}/settings?tab=wallet&status=paypal-success`;
    const cancelUrl = `${appUrl}/settings?tab=wallet&status=paypal-cancel`;

    const orderData = await createPayPalOrder(Number(amount), returnUrl, cancelUrl);

    // Secure the orderId by persisting it in the DB to assert ownership during capture
    const targetLedgerPool = ledgerPool || pool;
    if (targetLedgerPool) {
      await targetLedgerPool.query(`
        INSERT INTO deposit_requests (user_id, amount, method, proof_url, status)
        VALUES ($1, $2, 'PayPal', $3, 'initialized')
      `, [req.user.id, Number(amount), JSON.stringify({ orderId: orderData.orderId })]);
    }

    res.json({ url: orderData.approveUrl, orderId: orderData.orderId });
  } catch (error: any) {
    console.error('[PayPal Deposit] Order creation error:', error);
    res.status(500).json({ error: error.message || 'Failed to create PayPal deposit session' });
  }
});

router.post("/paypal-capture", authenticateToken, async (req: any, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Assert that this order ID was indeed initiated by the current user
    const targetLedgerPool = ledgerPool || pool;
    let validOrder: any = null;

    if (targetLedgerPool) {
      const orderCheckForUser = await targetLedgerPool.query(`
        SELECT * FROM deposit_requests 
        WHERE user_id = $1 AND method = 'PayPal' AND (status = 'initialized' OR status = 'pending')
      `, [req.user.id]);

      validOrder = orderCheckForUser.rows.find((row: any) => {
        try {
          const proof = JSON.parse(row.proof_url || '{}');
          return proof.orderId === orderId;
        } catch {
          return false;
        }
      });

      if (!validOrder) {
        return res.status(403).json({ error: 'Unauthorized: This PayPal order was not initiated by your account or has already been captured.' });
      }
    }

    const captureResult = await capturePayPalOrder(orderId);
    if (captureResult.success && captureResult.amount) {
      if (targetLedgerPool && validOrder) {
        await targetLedgerPool.query(`
          UPDATE deposit_requests 
          SET status = 'approved', updated_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [validOrder.id]);
      }

      await depositToWallet(
        req.user.id,
        captureResult.amount,
        'PayPal Gateway',
        `PayPal Order Capture ${orderId}`
      );
      return res.json({ success: true, amount: captureResult.amount });
    } else {
      return res.status(400).json({ error: `PayPal capture failed: ${captureResult.status}` });
    }
  } catch (error: any) {
    console.error('[PayPal Deposit] Capture error:', error);
    res.status(500).json({ error: error.message || 'Failed to capture PayPal deposit' });
  }
});

router.post("/stripe-deposit", authenticateToken, async (req: any, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }
    const stripe = await getStripe();
    if (!stripe) {
      return res.status(400).json({ error: 'Payments not configured' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ 
        price_data: { 
          currency: 'usd', 
          product_data: { 
            name: `Perplexta Wallet Deposit`,
            description: `Deposit to Perplexta Digital Wallet`
          }, 
          unit_amount: Math.round(Number(amount) * 100) 
        }, 
        quantity: 1 
      }],
      mode: 'payment',
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/settings?tab=wallet&status=stripe-success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/settings?tab=wallet&status=cancel`,
      metadata: { 
        userId: req.user.id.toString(), 
        amount: amount.toString(),
        type: 'deposit'
      }
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe Deposit] Checkout error:', error);
    res.status(500).json({ error: 'Failed to create deposit session' });
  }
});

router.get("/verify-stripe-session", authenticateToken, async (req: any, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const stripe = await getStripe();
    if (!stripe) {
      return res.status(400).json({ error: 'Payments not configured' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const userId = session.metadata?.userId;
    const amount = session.metadata?.amount;
    const type = session.metadata?.type;

    if (userId !== req.user.id.toString() || type !== 'deposit') {
      return res.status(403).json({ error: 'Unauthorized: Session details mismatch.' });
    }

    return res.json({ success: true, amount: parseFloat(amount || '0') });
  } catch (error: any) {
    console.error('[Stripe Verify Session] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify checkout session' });
  }
});

router.post("/stripe-checkout", authenticateToken, async (req: any, res) => {
  try {
    const { planId, billingCycle } = req.body;
    
    // Low Severity Fix: Validate billingCycle to be only monthly or annual
    if (billingCycle !== 'monthly' && billingCycle !== 'annual') {
      return res.status(400).json({ error: 'Invalid billing cycle. Must be monthly or annual.' });
    }

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
        if (session.metadata?.type === 'deposit') {
          const userId = session.metadata.userId;
          const amount = parseFloat(session.metadata.amount);
          if (userId && !isNaN(amount)) {
            await depositToWallet(userId, amount, 'Stripe Gateway', `Stripe Checkout Session ${session.id}`);
          }
        } else {
          const { userId, planId, billingCycle } = session.metadata;
          if (userId && planId) {
            await activateStripeSubscription(userId, planId, session.subscription, billingCycle || 'monthly');
          }
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
