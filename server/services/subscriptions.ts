import { pool } from '../db/index.js';
import { deductFromWallet, refundToWallet } from './wallet.js';
import { createNotification } from './notifications.js';
import { io } from '../config/socket.js';

export async function purchaseSubscription(userId: string, planId: string, billingCycle: 'monthly' | 'annual') {
  if (!pool) throw new Error('Database initializing');

  const planRes = await pool.query('SELECT * FROM plans WHERE id = $1 AND is_active = true', [planId]);
  if (planRes.rows.length === 0) throw new Error('Plan not found or inactive');
  const plan = planRes.rows[0];

  const price = billingCycle === 'annual' ? Number(plan.annual_price) : Number(plan.monthly_price);
  
  try {
    await deductFromWallet(userId, price, 'subscription_payment', `Payment for ${plan.name_en} (${billingCycle})`);
  } catch (err: any) {
    if (err.message === 'Insufficient balance') throw err;
    throw new Error('Failed to process payment');
  }

  try {
    const cycleDays = billingCycle === 'annual' ? 365 : 30;
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + cycleDays);

    await pool.query(`
      INSERT INTO subscriptions (user_id, plan_id, status, billing_period, current_period_end)
      VALUES ($1, $2, 'active', $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        billing_period = EXCLUDED.billing_period,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, planId, billingCycle, periodEnd]);

    await createNotification(
      userId, 
      'success',
      'Subscription Activated',
      'تم تفعيل الاشتراك',
      `Your ${plan.name_en} subscription is now active.`,
      `اشتراكك في باقة ${plan.name_ar} فعال الآن.`
    );
    
    if (io) {
      io.to(`user_${userId}`).emit('user_profile_updated');
    }

    return { success: true, message: 'Subscription activated' };
  } catch (error) {
    console.error('[SubscriptionService] Core DB update failed, attempting refund:', error);
    try {
      await refundToWallet(userId, price, 'subscription_refund', `Refund due to system error during ${plan.name_en} activation`);
    } catch (refundErr) {
      console.error('[SubscriptionService] CRITICAL: Refund failed after Core DB error:', refundErr);
    }
    throw new Error('Failed to update subscription. Payment was refunded.');
  }
}

export async function getSubscriptionStatus(userId: string) {
  if (!pool) throw new Error('Database initializing');
  const result = await pool.query(`
    SELECT s.*, p.name_en as plan_name_en, p.name_ar as plan_name_ar, p.limits, p.color as plan_color
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.user_id = $1 AND s.status = 'active' AND s.current_period_end > NOW()
  `, [userId]);
  return result.rows[0] || null;
}

export async function activateStripeSubscription(userId: string, planId: string, subscriptionId: string, billingCycle: string, stripeCustomerId?: string) {
  if (!pool) return;
  
  const cycleDays = billingCycle === 'annual' ? 365 : 30;
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + cycleDays);

  await pool.query(`
    INSERT INTO subscriptions (user_id, plan_id, status, billing_period, current_period_end, stripe_subscription_id, stripe_customer_id)
    VALUES ($1, $2, 'active', $3, $4, $5, $6)
    ON CONFLICT (user_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = 'active',
      billing_period = EXCLUDED.billing_period,
      current_period_end = EXCLUDED.current_period_end,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
      updated_at = CURRENT_TIMESTAMP
  `, [userId, planId, billingCycle, periodEnd, subscriptionId, stripeCustomerId || null]);

  await createNotification(
    userId, 
    'success',
    'Subscription Activated',
    'تم تفعيل الاشتراك',
    `Your subscription has been activated successfully via Stripe.`,
    `تم تفعيل اشتراكك بنجاح عبر Stripe.`
  );

  if (io) {
    io.to(`user_${userId}`).emit('user_profile_updated');
  }
}

export async function cancelSubscription(userId: string) {
  if (!pool) return;
  
  await pool.query(`
    UPDATE subscriptions 
    SET status = 'canceled', updated_at = CURRENT_TIMESTAMP 
    WHERE user_id = $1
  `, [userId]);

  await createNotification(
    userId, 
    'warning',
    'Subscription Canceled',
    'تم إلغاء الاشتراك',
    `Your subscription has been canceled or expired.`,
    `تم إلغاء اشتراكك أو انتهت صلاحيته.`
  );

  if (io) {
    io.to(`user_${userId}`).emit('user_profile_updated');
  }
}
