import Stripe from 'stripe';
import { pool } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';

let stripeClient: Stripe | null = null;
let stripeWebhookSecret: string | null = null;

export async function getStripe(): Promise<Stripe | null> {
  if (stripeClient) return stripeClient;

  try {
    const settings = await pool.query('SELECT stripe_secret_key, stripe_webhook_secret FROM system_settings LIMIT 1');
    if (settings.rows.length > 0 && settings.rows[0].stripe_secret_key) {
      stripeClient = new Stripe(decrypt(settings.rows[0].stripe_secret_key));
      stripeWebhookSecret = settings.rows[0].stripe_webhook_secret ? decrypt(settings.rows[0].stripe_webhook_secret) : null;
      return stripeClient;
    }
  } catch (e) {
    console.error('[Stripe] Initialization failed:', e);
  }
  return null;
}

export function getWebhookSecret() {
  return stripeWebhookSecret;
}
