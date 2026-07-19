import { pool, ledgerPool } from './index.js';
import { decrypt } from '../utils/crypto.js';

// ─── Custom DataLoader implementation ─────────────────────────────────────────

type BatchLoadFn<K, V> = (keys: readonly K[]) => Promise<readonly V[]>;

export class DataLoader<K, V> {
  private batchLoadFn: BatchLoadFn<K, V>;
  private cache = new Map<K, V>();
  private queue: { key: K; resolve: (val: V) => void; reject: (err: Error) => void }[] = [];
  private hasScheduled = false;
  private ttl: number;
  private cacheTimestamps = new Map<K, number>();

  constructor(batchLoadFn: BatchLoadFn<K, V>, options?: { ttl?: number }) {
    this.batchLoadFn = batchLoadFn;
    this.ttl = options?.ttl ?? 0; // 0 means no TTL (unlimited cache)
  }

  async load(key: K): Promise<V> {
    const now = Date.now();
    if (this.ttl > 0 && this.cache.has(key)) {
      const created = this.cacheTimestamps.get(key) || 0;
      if (now - created < this.ttl) {
        return this.cache.get(key)!;
      } else {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
      }
    } else if (this.ttl === 0 && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    return new Promise<V>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });
      if (!this.hasScheduled) {
        this.hasScheduled = true;
        process.nextTick(() => this.dispatchBatch());
      }
    });
  }

  async loadMany(keys: readonly K[]): Promise<V[]> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  clear(key: K) {
    this.cache.delete(key);
    this.cacheTimestamps.delete(key);
  }

  clearAll() {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  prime(key: K, value: V) {
    this.cache.set(key, value);
    if (this.ttl > 0) {
      this.cacheTimestamps.set(key, Date.now());
    }
  }

  private async dispatchBatch() {
    this.hasScheduled = false;
    const currentQueue = this.queue;
    this.queue = [];

    if (currentQueue.length === 0) return;

    const keys = currentQueue.map(q => q.key);
    try {
      const results = await this.batchLoadFn(keys);
      if (results.length !== keys.length) {
        throw new Error('DataLoader batchLoadFn returned result list length unequal to key list length.');
      }
      currentQueue.forEach((q, idx) => {
        const value = results[idx];
        if (value instanceof Error) {
          q.reject(value);
        } else {
          this.prime(q.key, value);
          q.resolve(value);
        }
      });
    } catch (err: any) {
      currentQueue.forEach(q => q.reject(err));
    }
  }
}

// ─── Batch Loaders (Durable Pool Optimization) ──────────────────────────────

/**
 * Batched user loading to handle multiple parallel requests
 * (e.g. during authentication, workspace integrations, chat loops)
 */
export const userLoader = new DataLoader<number | string, any>(async (ids) => {
  if (ids.length === 0) return [];
  const uniqueIds = Array.from(new Set(ids)).map(id => typeof id === 'number' ? id : parseInt(id, 10));
  
  try {
    const res = await pool.query(
      'SELECT id, name, email, role, status, kyc_status, language, theme, memory, last_active_at, created_at, avatar FROM users WHERE id = ANY($1)',
      [uniqueIds]
    );
    const userMap = new Map<number, any>();
    res.rows.forEach((row: any) => userMap.set(row.id, row));
    return ids.map(id => {
      const idNum = typeof id === 'number' ? id : parseInt(id, 10);
      return userMap.get(idNum) || null;
    });
  } catch (err: any) {
    console.error('[DataLoader] Failed to batch load users:', err.message);
    return ids.map(() => err);
  }
}, { ttl: 15000 }); // 15-second cache for user metadata

/**
 * Batched wallet loading for ledger integrity
 */
export const walletLoader = new DataLoader<number | string, any>(async (userIds) => {
  if (userIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(userIds)).map(id => typeof id === 'number' ? id : parseInt(id, 10));
  const target = ledgerPool || pool;

  try {
    const res = await target.query(
      'SELECT id, user_id, balance, usd_balance, points, referral_activated, created_at, updated_at FROM wallets WHERE user_id = ANY($1)',
      [uniqueIds]
    );
    const walletMap = new Map<number, any>();
    res.rows.forEach((row: any) => walletMap.set(row.user_id, row));
    return userIds.map(id => {
      const idNum = typeof id === 'number' ? id : parseInt(id, 10);
      return walletMap.get(idNum) || null;
    });
  } catch (err: any) {
    console.error('[DataLoader] Failed to batch load wallets:', err.message);
    return userIds.map(() => err);
  }
}, { ttl: 5000 }); // 5-second cache for rapid point/balance changes

/**
 * Batched subscription checking
 */
export const subscriptionLoader = new DataLoader<number | string, any>(async (userIds) => {
  if (userIds.length === 0) return [];
  const uniqueIds = Array.from(new Set(userIds)).map(id => typeof id === 'number' ? id : parseInt(id, 10));

  try {
    const res = await pool.query(
      'SELECT id, user_id, plan_id, stripe_customer_id, stripe_subscription_id, status, billing_period, current_period_end, created_at, updated_at FROM subscriptions WHERE user_id = ANY($1)',
      [uniqueIds]
    );
    const subMap = new Map<number, any>();
    res.rows.forEach((row: any) => subMap.set(row.user_id, row));
    return userIds.map(id => {
      const idNum = typeof id === 'number' ? id : parseInt(id, 10);
      return subMap.get(idNum) || null;
    });
  } catch (err: any) {
    console.error('[DataLoader] Failed to batch load subscriptions:', err.message);
    return userIds.map(() => err);
  }
}, { ttl: 20000 }); // 20-second cache for subscription status

// ─── High-Performance TTL Cached Services ────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const systemSettingsCache = new Map<string, CacheEntry<any>>();
const economySettingsCache = new Map<string, CacheEntry<any>>();
const orchestratorConfigCache = new Map<string, CacheEntry<any>>();
const activePlansCache = new Map<string, CacheEntry<any>>();
const apiKeysVaultCache = new Map<string, CacheEntry<any>>();

const TTL_SYSTEM = 300000;      // 5 minutes
const TTL_ECONOMY = 60000;       // 1 minute
const TTL_ORCHESTRATOR = 30000;  // 30 seconds
const TTL_PLANS = 180000;       // 3 minutes
const TTL_API_KEYS = 15000;     // 15 seconds

/** Helper to decrypt text securely */
function safeDecrypt(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try { return decrypt(value); } catch { return value; }
}

/** Get system settings from cache or DB */
export async function getCachedSystemSettings(): Promise<any> {
  const now = Date.now();
  const cached = systemSettingsCache.get('global');
  if (cached && now - cached.timestamp < TTL_SYSTEM) {
    return cached.data;
  }

  const result = await pool.query(`
    SELECT 
      site_name_en, site_name_ar, site_description_en, site_description_ar,
      seo_description_en, seo_description_ar, keywords_en, keywords_ar,
      google_analytics_id, google_site_verification, logo_url, logo_light_url, favicon_url, seo_image_url,
      stripe_status, stripe_last_verified_at, stripe_publishable_key, stripe_live_mode,
      paypal_status, paypal_last_verified_at, paypal_client_id, paypal_mode, image_prompt_pref_threshold,
      blocked_paths, seo_site_name_en, seo_site_name_ar
    FROM system_settings LIMIT 1
  `);

  let settings = result.rows[0];
  if (!settings) {
    // Seed default if table is empty
    await pool.query(`
      INSERT INTO system_settings (site_name_en, site_name_ar, logo_url, logo_light_url, favicon_url)
      VALUES ('Premium AI', 'منصة النخبة', null, null, null)
    `);
    const secondTry = await pool.query(`
      SELECT 
        site_name_en, site_name_ar, site_description_en, site_description_ar,
        seo_description_en, seo_description_ar, keywords_en, keywords_ar,
        google_analytics_id, google_site_verification, logo_url, logo_light_url, favicon_url, seo_image_url,
        stripe_status, stripe_last_verified_at, stripe_publishable_key, stripe_live_mode,
        paypal_status, paypal_last_verified_at, paypal_client_id, paypal_mode, image_prompt_pref_threshold,
        blocked_paths, seo_site_name_en, seo_site_name_ar
      FROM system_settings LIMIT 1
    `);
    settings = secondTry.rows[0];
  }

  if (settings.stripe_publishable_key) {
    settings.stripe_publishable_key = safeDecrypt(settings.stripe_publishable_key, '');
  }
  if (settings.paypal_client_id) {
    settings.paypal_client_id = safeDecrypt(settings.paypal_client_id, '');
  }

  systemSettingsCache.set('global', { data: settings, timestamp: now });
  return settings;
}

export function invalidateSystemSettingsCache() {
  systemSettingsCache.delete('global');
}

/** Get economy settings from cache or DB */
export async function getCachedEconomySettings(): Promise<any> {
  const now = Date.now();
  const cached = economySettingsCache.get('global');
  if (cached && now - cached.timestamp < TTL_ECONOMY) {
    return cached.data;
  }

  const target = ledgerPool || pool;
  const res = await target.query('SELECT * FROM economy_settings LIMIT 1');

  let settings: any;
  if (res.rows.length > 0) {
    settings = { ...res.rows[0] };
  } else {
    settings = {
      points_per_dollar:               1000,
      min_payout_usd:                  10,
      min_deposit_usd:                 5,
      referral_bonus_percent:          10,
      welcome_bonus_points:            600,
      referral_bonus_points:           1000,
      conversion_rate:                 0.001,
      min_withdrawal_cents:            1000,
      referral_activation_min_deposit: 10,
      crypto_address:  process.env.DEFAULT_CRYPTO_ADDRESS  || 'YOUR_DEFAULT_CRYPTO_ADDRESS',
      bank_name:       process.env.DEFAULT_BANK_NAME       || 'Your Default Bank',
      bank_recipient:  process.env.DEFAULT_BANK_RECIPIENT  || 'Your Default Business Platforms LTD.',
      bank_iban:       process.env.DEFAULT_BANK_IBAN       || 'IL00000000000000000000',
      bank_swift:      process.env.DEFAULT_BANK_SWIFT      || 'TESTIL33XXX',
      paypal_email:    process.env.DEFAULT_PAYPAL_EMAIL    || 'paypal-sandbox@yourdomain.com',
    };
  }

  settings.crypto_address  = safeDecrypt(settings.crypto_address,  process.env.DEFAULT_CRYPTO_ADDRESS  || 'YOUR_DEFAULT_CRYPTO_ADDRESS');
  settings.bank_name       = safeDecrypt(settings.bank_name,       process.env.DEFAULT_BANK_NAME       || 'Your Default Bank');
  settings.bank_recipient  = safeDecrypt(settings.bank_recipient,  process.env.DEFAULT_BANK_RECIPIENT  || 'Your Default Business Platforms LTD.');
  settings.bank_iban       = safeDecrypt(settings.bank_iban,       process.env.DEFAULT_BANK_IBAN       || 'IL00000000000000000000');
  settings.bank_swift      = safeDecrypt(settings.bank_swift,      process.env.DEFAULT_BANK_SWIFT      || 'TESTIL33XXX');
  settings.paypal_email    = safeDecrypt(settings.paypal_email,    process.env.DEFAULT_PAYPAL_EMAIL    || 'paypal-sandbox@yourdomain.com');

  economySettingsCache.set('global', { data: settings, timestamp: now });
  return settings;
}

export function invalidateEconomySettingsCache() {
  economySettingsCache.delete('global');
}

/** Get cached tool orchestrator configurations */
export async function getCachedOrchestratorConfig(toolId: string): Promise<any> {
  const now = Date.now();
  const cached = orchestratorConfigCache.get(toolId);
  if (cached && now - cached.timestamp < TTL_ORCHESTRATOR) {
    return cached.data;
  }

  const res = await pool.query('SELECT * FROM tool_orchestrator WHERE tool_id = $1 AND is_active = true', [toolId]);
  const config = res.rows[0] || null;

  orchestratorConfigCache.set(toolId, { data: config, timestamp: now });
  return config;
}

export function invalidateOrchestratorConfigCache(toolId?: string) {
  if (toolId) {
    orchestratorConfigCache.delete(toolId);
  } else {
    orchestratorConfigCache.clear();
  }
}

/** Get active marketplace subscription plans from cache */
export async function getCachedActivePlans(): Promise<any[]> {
  const now = Date.now();
  const cached = activePlansCache.get('global');
  if (cached && now - cached.timestamp < TTL_PLANS) {
    return cached.data;
  }

  const res = await pool.query('SELECT * FROM plans ORDER BY price_monthly ASC');
  const plans = res.rows;

  activePlansCache.set('global', { data: plans, timestamp: now });
  return plans;
}

export function invalidatePlansCache() {
  activePlansCache.delete('global');
}

/** Get cached active API Key records from vault */
export async function getCachedApiKeysVault(): Promise<any[]> {
  const now = Date.now();
  const cached = apiKeysVaultCache.get('global');
  if (cached && now - cached.timestamp < TTL_API_KEYS) {
    return cached.data;
  }

  const res = await pool.query('SELECT * FROM api_keys_vault WHERE is_active = true');
  const keys = res.rows.map((row: any) => {
    const dec = { ...row };
    if (dec.encrypted_key) {
      try {
        dec.decrypted_key = decrypt(dec.encrypted_key);
      } catch (e) {
        dec.decrypted_key = dec.encrypted_key;
      }
    }
    return dec;
  });

  apiKeysVaultCache.set('global', { data: keys, timestamp: now });
  return keys;
}

export function invalidateApiKeysVaultCache() {
  apiKeysVaultCache.delete('global');
}
