import express from 'express';
import { getStripe, getWebhookSecret, createPayPalOrder, capturePayPalOrder } from '../services/payments.js';
import { authenticateToken } from '../middleware/auth.js';
import { pool, ledgerPool } from '../db/index.js';
import { activateStripeSubscription, cancelSubscription } from '../services/subscriptions.js';
import { depositToWallet, getUserWallet } from '../services/wallet.js';
import { createNotification } from '../services/notifications.js';

const router = express.Router();

const ledgerTarget = () => ledgerPool || pool;


router.post("/paypal-deposit", authenticateToken, async (req: any, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid deposit amount' });
    }
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const orderData = await createPayPalOrder(
      Number(amount),
      `${appUrl}/settings?tab=wallet&status=paypal-success`,
      `${appUrl}/settings?tab=wallet&status=paypal-cancel`
    );
    const target = ledgerTarget();
    if (target) {
      await target.query(
        `INSERT INTO deposit_requests (user_id, amount, method, proof_url, status)
         VALUES ($1, $2, 'PayPal', $3, 'initialized')`,
        [req.user.id, Number(amount), JSON.stringify({ orderId: orderData.orderId })]
      );
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
    if (!orderId) return res.status(400).json({ error: 'Order ID is required' });

    const target = ledgerTarget();
    let validOrder: any = null;

    if (target) {
      const orderCheck = await target.query(
        `SELECT * FROM deposit_requests
         WHERE user_id = $1 AND method = 'PayPal' AND status IN ('initialized','pending')`,
        [req.user.id]
      );
      validOrder = orderCheck.rows.find((row: any) => {
        try { return JSON.parse(row.proof_url || '{}').orderId === orderId; }
        catch { return false; }
      });
      if (!validOrder) {
        return res.status(403).json({ error: 'Unauthorized: This PayPal order was not initiated by your account or has already been captured.' });
      }
    }

    const captureResult = await capturePayPalOrder(orderId, validOrder ? parseFloat(validOrder.amount) : undefined);
    if (captureResult.success && captureResult.amount) {
      if (target && validOrder) {
        await target.query(
          `UPDATE deposit_requests SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [validOrder.id]
        );
      }
      await depositToWallet(req.user.id, captureResult.amount, 'PayPal Gateway', `PayPal Order Capture ${orderId}`);
      return res.json({ success: true, amount: captureResult.amount });
    }
    return res.status(400).json({ error: `PayPal capture failed: ${captureResult.status}` });
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
      return res.status(400).json({
        error: 'Stripe is not configured or activated by the administrator.',
        error_ar: 'عذراً، بوابة الدفع Stripe غير مهيأة أو غير مفعلة من قِبل مسؤول النظام حالياً.',
      });
    }
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Perplexta Wallet Deposit', description: 'Deposit to Perplexta Digital Wallet' },
          unit_amount: Math.round(Number(amount) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${appUrl}/settings?tab=wallet&status=stripe-success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/settings?tab=wallet&status=cancel`,
      metadata: { userId: req.user.id.toString(), amount: amount.toString(), type: 'deposit' },
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
    if (!session_id) return res.status(400).json({ error: 'Session ID is required' });

    const stripe = await getStripe();
    if (!stripe) return res.status(400).json({ error: 'Payments not configured' });

    const session = await stripe.checkout.sessions.retrieve(session_id.toString());
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { userId, amount, type } = session.metadata || {};
    if (!userId || userId !== req.user.id.toString() || type !== 'deposit') {
      return res.status(403).json({ error: 'Unauthorized: Session details mismatch.' });
    }
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Unpaid session: payment has not been successfully completed.' });
    }

    const target = ledgerTarget();
    if (target) {
      const eventCheck = await target.query('SELECT 1 FROM stripe_events WHERE stripe_event_id = $1', [session.id]);
      if (eventCheck.rows.length === 0) {
        try {
          await target.query(
            'INSERT INTO stripe_events (stripe_event_id, type, status, metadata) VALUES ($1,$2,$3,$4)',
            [session.id, 'checkout.session.completed_sync', 'processed', JSON.stringify(session.metadata || {})]
          );
          const actualAmount = session.amount_total ? session.amount_total / 100 : parseFloat(amount || '0');
          await depositToWallet(userId, actualAmount, 'Stripe Gateway', `Stripe Checkout Session ${session.id}`);
          const { io } = await import('../config/socket.js');
          if (io) {
            io.to(`user_${userId}`).emit('user_profile_updated');
            io.to(`user_${userId}`).emit('wallet_updated', { balance_usd: true });
          }
        } catch (e: any) {
          if (e.code !== '23505') throw e;
        }
      }
    }
    return res.json({ success: true, amount: session.amount_total ? session.amount_total / 100 : parseFloat(amount || '0') });
  } catch (error: any) {
    console.error('[Stripe Verify Session] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify checkout session' });
  }
});

router.get("/verify-subscription-session", authenticateToken, async (req: any, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'Session ID is required' });

    const stripe = await getStripe();
    if (!stripe) return res.status(400).json({ error: 'Payments not configured' });

    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { userId, planId, billingCycle } = session.metadata || {};
    if (!userId || !planId)               return res.status(400).json({ error: 'Invalid session metadata: user_id or plan_id is missing' });
    if (userId !== req.user.id.toString()) return res.status(403).json({ error: 'Unauthorized: Session details mismatch.' });
    if (session.payment_status !== 'paid') return res.status(400).json({ error: 'Unpaid session: payment has not been successfully completed.' });

    const target = ledgerTarget();
    if (target) {
      const eventCheck = await target.query('SELECT 1 FROM stripe_events WHERE stripe_event_id = $1', [session.id]);
      if (eventCheck.rows.length > 0) return res.json({ success: true, alreadyProcessed: true });
      try {
        await target.query(
          'INSERT INTO stripe_events (stripe_event_id, type, status, metadata) VALUES ($1,$2,$3,$4)',
          [session.id, 'subscription.session.verified', 'processed', JSON.stringify(session.metadata || {})]
        );
      } catch (e: any) {
        if (e.code === '23505') return res.json({ success: true, alreadyProcessed: true });
        throw e;
      }
    }
    await activateStripeSubscription(userId, planId, (session.subscription as string) || '', billingCycle || 'monthly', (session.customer as string) || '');
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Stripe Verify Subscription Session] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify subscription checkout session' });
  }
});

router.post("/stripe-checkout", authenticateToken, async (req: any, res) => {
  try {
    const { planId, billingCycle } = req.body;
    if (billingCycle !== 'monthly' && billingCycle !== 'annual') {
      return res.status(400).json({ error: 'Invalid billing cycle. Must be monthly or annual.' });
    }
    const stripe = await getStripe();
    if (!stripe) return res.status(400).json({ error: 'Payments not configured' });

    const planRes = await pool.query('SELECT * FROM plans WHERE id = $1 AND is_active = true', [planId]);
    if (planRes.rows.length === 0) return res.status(404).json({ error: 'Plan not found or is no longer available.' });
    const plan  = planRes.rows[0];
    const price = billingCycle === 'annual' ? Number(plan.annual_price) : Number(plan.monthly_price);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Perplexta - ${plan.name_en}`, description: `Subscription: ${billingCycle}` },
          unit_amount: Math.round(price * 100),
          recurring: { interval: billingCycle === 'annual' ? 'year' : 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      subscription_data: {
        metadata: { userId: req.user.id.toString(), planId: planId.toString(), billingCycle },
      },
      success_url: `${appUrl}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/subscription?canceled=true`,
      metadata: { userId: req.user.id.toString(), planId: planId.toString(), billingCycle },
    });
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe] Checkout error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});


router.post("/webhook", async (req: any, res) => {
  const stripe = await getStripe();
  const webhookSecret = getWebhookSecret();
  if (!stripe || !webhookSecret) {
    console.error('[Stripe Webhook] Unconfigured (missing client or secret)');
    return res.status(400).send('Webhook unconfigured');
  }

  const sig = req.headers['stripe-signature'] as string;
  if (!sig) return res.status(400).send('Missing signature');

  let event: any;
  try {
    const rawBody = req.rawBody || req.body;
    event = stripe.webhooks.constructEvent(
      rawBody instanceof Buffer ? rawBody : Buffer.from(rawBody),
      sig, webhookSecret
    );
  } catch (err: any) {
    console.error(`[Stripe] Signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook signature invalid: ${err.message}`);
  }

  /** Verify userId exists in core DB before any wallet/subscription operation. */
  async function assertUserExists(userId: string | undefined): Promise<boolean> {
    if (!userId) return false;
    const check = await pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);
    if (check.rows.length === 0) {
      console.warn(`[Stripe Webhook] Skipping ${event.type} — user ${userId} not found`);
      return false;
    }
    return true;
  }

  try {
    console.log(`[Stripe Webhook] Event: ${event.type}`);

    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as any;

        if (session.metadata?.type === 'deposit') {
          const userId = session.metadata.userId;
          const amount = session.amount_total ? session.amount_total / 100 : parseFloat(session.metadata?.amount || '0');
          if (userId && !isNaN(amount)) {
            const target = ledgerTarget();
            if (target) {
              const eventCheck = await target.query('SELECT 1 FROM stripe_events WHERE stripe_event_id = $1', [session.id]);
              if (eventCheck.rows.length === 0) {
                try {
                  await target.query(
                    'INSERT INTO stripe_events (stripe_event_id, type, status, metadata) VALUES ($1,$2,$3,$4)',
                    [session.id, 'checkout.session.completed', 'processed', JSON.stringify(session.metadata || {})]
                  );
                  await depositToWallet(userId, amount, 'Stripe Gateway', `Stripe Checkout Session ${session.id}`);
                } catch (e: any) {
                  if (e.code !== '23505') console.error('[Stripe Webhook] Deposit error:', e);
                }
              }
            }
          }


        } else {
          const { userId, planId, billingCycle } = session.metadata || {};
          if (userId && planId) {
            await activateStripeSubscription(userId, planId, (session.subscription as string) || '', billingCycle || 'monthly', (session.customer as string) || '');
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const stripeSubscriptionId = invoice.subscription;
        if (!stripeSubscriptionId) break;

        let userId       = invoice.subscription_details?.metadata?.userId || invoice.metadata?.userId;
        let planId       = invoice.subscription_details?.metadata?.planId  || invoice.metadata?.planId;
        let billingCycle = invoice.subscription_details?.metadata?.billingCycle || invoice.metadata?.billingCycle || 'monthly';

        if (!userId) {
          const subCheck = await pool.query(
            'SELECT user_id, plan_id, billing_period FROM subscriptions WHERE stripe_subscription_id = $1',
            [stripeSubscriptionId]
          );
          if (subCheck.rows.length > 0) {
            userId       = subCheck.rows[0].user_id;
            planId       = subCheck.rows[0].plan_id;
            billingCycle = subCheck.rows[0].billing_period || billingCycle;
          } else {
            try {
              const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId as string);
              userId       = stripeSub.metadata?.userId;
              planId       = stripeSub.metadata?.planId;
              billingCycle = stripeSub.metadata?.billingCycle || billingCycle;
            } catch (subErr: any) {
              console.error('[Stripe Webhook] Failed to retrieve subscription:', subErr.message);
            }
          }
        }

        if (!userId || !planId) {
          console.warn(`[Stripe Webhook] Could not resolve user/plan for invoice ${invoice.id}`);
          break;
        }

        if (!await assertUserExists(userId)) break;

        const planRes  = await pool.query('SELECT * FROM plans WHERE id = $1', [planId]);
        const plan     = planRes.rows[0];
        const planName = plan ? plan.name_en : 'Premium Plan';

        let periodEnd   = new Date();
        let periodStart = new Date();
        if (invoice.lines?.data?.[0]?.period?.end)   periodEnd   = new Date(invoice.lines.data[0].period.end   * 1000);
        else { const days = billingCycle === 'annual' ? 365 : 30; periodEnd.setDate(periodEnd.getDate() + days); }
        if (invoice.lines?.data?.[0]?.period?.start) periodStart = new Date(invoice.lines.data[0].period.start * 1000);

        await pool.query(`
          INSERT INTO subscriptions
            (user_id, plan_id, status, billing_period, current_period_end, last_period_start, stripe_customer_id, stripe_subscription_id)
          VALUES ($1,$2,'active',$3,$4,$5,$6,$7)
          ON CONFLICT (user_id) DO UPDATE SET
            plan_id                = EXCLUDED.plan_id,
            status                 = 'active',
            billing_period         = EXCLUDED.billing_period,
            current_period_end     = EXCLUDED.current_period_end,
            last_period_start      = EXCLUDED.last_period_start,
            stripe_customer_id     = EXCLUDED.stripe_customer_id,
            stripe_subscription_id = EXCLUDED.stripe_subscription_id,
            updated_at             = CURRENT_TIMESTAMP
        `, [userId, planId, billingCycle, periodEnd, periodStart, invoice.customer, stripeSubscriptionId]);

        const amountUSD = (invoice.amount_paid || 0) / 100;
        const lTarget   = ledgerTarget();
        if (lTarget && amountUSD > 0) {
          const client = await lTarget.connect();
          try {
            await client.query('BEGIN');
            const wallet = await getUserWallet(userId, client); // uses FOR UPDATE via txClient
            await client.query(
              `INSERT INTO ledger_transactions
                 (user_id, wallet_id, amount, transaction_type, status, reference_id, description, metadata)
               VALUES ($1,$2,$3,'subscription_stripe','success',$4,$5,$6)`,
              [
                userId, wallet.id, -amountUSD, invoice.id,
                `Stripe Subscription Payment for ${planName} (${billingCycle})`,
                JSON.stringify({
                  stripe_invoice_id:      invoice.id,
                  stripe_subscription_id: stripeSubscriptionId,
                  stripe_customer_id:     invoice.customer,
                  amount_paid_cents:      invoice.amount_paid,
                }),
              ]
            );
            await client.query('COMMIT');
          } catch (err) {
            await client.query('ROLLBACK');
            throw err;
          } finally {
            client.release();
          }
        }

        await createNotification(
          userId, 'success',
          'Subscription Renewed', 'تم تجديد الاشتراك',
          `Your subscription for ${planName} has been successfully renewed via Stripe.`,
          `تم تجديد اشتراكك في باقة ${plan ? plan.name_ar : 'المميزة'} بنجاح عبر Stripe.`
        );

        const { io } = await import('../config/socket.js');
        if (io) {
          io.to(`user_${userId}`).emit('user_profile_updated');
          io.to(`user_${userId}`).emit('quota_reset', { reason: 'stripe_invoice_renewal', planId, stripeSubscriptionId });
        }
        const { broadcastAdminStats } = await import('../services/admin.js');
        broadcastAdminStats().catch((err: any) => console.error('[Socket] broadcastAdminStats failed:', err));
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        let userId = subscription.metadata?.userId;
        if (!userId) {
          const subCheck = await pool.query('SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1', [subscription.id]);
          if (subCheck.rows.length > 0) userId = subCheck.rows[0].user_id;
        }
        if (!userId) { console.warn(`[Stripe Webhook] No user for deleted subscription ${subscription.id}`); break; }

        await pool.query(`UPDATE subscriptions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`, [userId]);
        await createNotification(userId, 'warning',
          'Subscription Expired', 'انتهت صلاحية الاشتراك',
          'Your subscription has expired. Access to premium tools has been revoked.',
          'انتهت صلاحية اشتراكك. تم سحب الوصول إلى الأدوات المتميزة.');
        const { io } = await import('../config/socket.js');
        if (io) {
          io.to(`user_${userId}`).emit('user_profile_updated');
          io.to(`user_${userId}`).emit('subscription_canceled', { userId, reason: 'stripe_deleted' });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        let userId = subscription.metadata?.userId;
        if (!userId) {
          const subCheck = await pool.query('SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1', [subscription.id]);
          if (subCheck.rows.length > 0) userId = subCheck.rows[0].user_id;
        }
        if (!userId) break;

        const localStatus = ['active', 'trialing'].includes(subscription.status) ? 'active' : 'expired';
        await pool.query(`UPDATE subscriptions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`, [localStatus, userId]);
        const { io } = await import('../config/socket.js');
        if (io) {
          io.to(`user_${userId}`).emit('user_profile_updated');
          if (localStatus === 'expired') io.to(`user_${userId}`).emit('subscription_canceled', { userId, reason: 'stripe_updated_expired' });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        let userId = invoice.subscription_details?.metadata?.userId || invoice.metadata?.userId;
        if (!userId && invoice.subscription) {
          const subCheck = await pool.query('SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1', [invoice.subscription]);
          if (subCheck.rows.length > 0) userId = subCheck.rows[0].user_id;
        }
        if (!userId) { console.warn(`[Stripe Webhook] No user for failed invoice ${invoice.id}`); break; }

        await pool.query(`UPDATE subscriptions SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`, [userId]);
        await createNotification(userId, 'warning',
          'Subscription Expired due to Failed Payment', 'انتهى الاشتراك بسبب فشل الدفع',
          'Your recurring subscription payment failed and your subscription has expired.',
          'فشلت عملية الدفع ولذلك انتهت صلاحية اشتراكك.');
        const { io } = await import('../config/socket.js');
        if (io) {
          io.to(`user_${userId}`).emit('user_profile_updated');
          io.to(`user_${userId}`).emit('subscription_canceled', { userId, reason: 'payment_failed' });
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error(`[Stripe] Webhook processing error: ${err.message}`);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
