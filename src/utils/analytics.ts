/**
 * Perplexta Platform - GTM & SEO Analytics Helper
 * Safe, type-safe helper methods for pushing standard events to the Google Tag Manager dataLayer.
 */

export interface GtmEventPayload {
  event: string;
  [key: string]: any;
}

/**
 * Pushes a generic or standard event payload to the GTM dataLayer.
 * Fails silently and gracefully if the dataLayer is not yet initialized.
 */
export const pushToDataLayer = (payload: GtmEventPayload) => {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    
    // Log in development for auditability
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[GTM dataLayer Event]: ${payload.event}`, payload);
    }
  }
};

/**
 * Triggers GTM dataLayer event when a user logs in successfully.
 */
export const trackLoginEvent = (userId: string, role: string, authProvider: string = 'email') => {
  pushToDataLayer({
    event: 'login',
    userId,
    userRole: role,
    method: authProvider,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Triggers GTM dataLayer event when a new user registers/signs up.
 */
export const trackSignUpEvent = (userId: string, authProvider: string = 'email') => {
  pushToDataLayer({
    event: 'signup',
    userId,
    method: authProvider,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Triggers GTM dataLayer event when a user initiates or registers a premium subscription.
 */
export const trackPremiumSubscriptionEvent = (
  userId: string,
  planId: string,
  planName: string,
  price: number,
  currency: string = 'USD',
  billingCycle: 'monthly' | 'yearly' | 'annual' = 'monthly'
) => {
  const normalizedCycle = billingCycle === 'annual' ? 'yearly' : billingCycle;
  pushToDataLayer({
    event: 'premium_subscription_started',
    userId,
    ecommerce: {
      transaction_id: `sub_${userId}_${Date.now()}`,
      affiliation: 'Perplexta Platform Upgrade',
      value: price,
      currency: currency,
      items: [
        {
          item_id: planId,
          item_name: planName,
          price: price,
          quantity: 1,
          item_category: 'Subscriptions',
          item_variant: normalizedCycle,
        }
      ]
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Triggers GTM dataLayer event when a user upgrades credit balances.
 */
export const trackCreditPurchaseEvent = (
  userId: string,
  amount: number,
  creditsAdded: number,
  currency: string = 'USD'
) => {
  pushToDataLayer({
    event: 'credit_purchase',
    userId,
    value: amount,
    currency: currency,
    credits: creditsAdded,
    timestamp: new Date().toISOString(),
  });
};
