import { pool, ledgerPool } from './index.js';
import { decrypt } from '../utils/crypto.js';
import NodeCache from 'node-cache';


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


/**
 * Batched user loading to handle multiple parallel requests
 * (e.g. during authentication, workspace integrations, chat loops)
 */
export const userLoader = new DataLoader<number | string, any>(async (ids) => {
  if (ids.length === 0) return [];
  if (!pool) return ids.map(() => null);
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
    console.warn('[DataLoader] Failed to batch load users:', err.message);
    return ids.map(() => null);
  }
}, { ttl: 15000 }); // 15-second cache for user metadata

/**
 * Batched wallet loading for ledger integrity
 */
export const walletLoader = new DataLoader<number | string, any>(async (userIds) => {
  if (userIds.length === 0) return [];
  const target = ledgerPool || pool;
  if (!target) return userIds.map(() => null);
  const uniqueIds = Array.from(new Set(userIds)).map(id => typeof id === 'number' ? id : parseInt(id, 10));

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
    console.warn('[DataLoader] Failed to batch load wallets:', err.message);
    return userIds.map(() => null);
  }
}, { ttl: 5000 }); // 5-second cache for rapid point/balance changes

/**
 * Batched subscription checking
 */
export const subscriptionLoader = new DataLoader<number | string, any>(async (userIds) => {
  if (userIds.length === 0) return [];
  if (!pool) return userIds.map(() => null);
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
    console.warn('[DataLoader] Failed to batch load subscriptions:', err.message);
    return userIds.map(() => null);
  }
}, { ttl: 20000 }); // 20-second cache for subscription status


interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const systemSettingsCache = new Map<string, CacheEntry<any>>();
const economySettingsCache = new Map<string, CacheEntry<any>>();
const orchestratorConfigCache = new Map<string, CacheEntry<any>>();
const activePlansCache = new Map<string, CacheEntry<any>>();
const apiKeysVaultCache = new Map<string, CacheEntry<any>>();

const TTL_SYSTEM = 60000;       // 60-second TTL cache for system_settings
const TTL_ECONOMY = 60000;      // 60-second TTL cache for economy_settings
const TTL_ORCHESTRATOR = 60000; // 60-second TTL cache for tool_orchestrator
const TTL_PLANS = 60000;        // 60-second TTL cache for plans
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

  const defaultSettings: any = {
    site_name_en: 'Perplexta',
    site_name_ar: 'بيربلكستا',
    site_description_en: 'Next-Generation AI Intelligence Platform',
    site_description_ar: 'منصة الذكاء الاصطناعي الفائقة',
    seo_description_en: 'Advanced AI Tools and Neural Models',
    seo_description_ar: 'أدوات الذكاء الاصطناعي والنماذج العصبية المتقدمة',
    keywords_en: 'AI, Machine Learning, Deep Research',
    keywords_ar: 'ذكاء اصطناعي, بحث عميق, أدوات ذكية',
    google_analytics_id: '',
    google_site_verification: '',
    logo_url: null,
    logo_light_url: null,
    favicon_url: null,
    seo_image_url: null,
    stripe_status: 'inactive',
    stripe_last_verified_at: null,
    stripe_publishable_key: '',
    stripe_secret_key: '',
    stripe_webhook_secret: '',
    stripe_live_mode: false,
    paypal_status: 'inactive',
    paypal_last_verified_at: null,
    paypal_client_id: '',
    paypal_client_secret: '',
    paypal_mode: 'sandbox',
    image_prompt_pref_threshold: 0.7,
    blocked_paths: '',
    seo_site_name_en: 'Perplexta',
    seo_site_name_ar: 'بيربلكستا',
    font_loading_config: JSON.stringify({
      ar: { fontFamily: 'Tajawal', enabled: true, url: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap' },
      en: { fontFamily: 'Space Grotesk', enabled: true, url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap' },
      dynamicLoading: true
    }),
    font_config_ar: JSON.stringify({ fontFamily: 'Tajawal', enabled: true, url: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap' }),
    font_config_en: JSON.stringify({ fontFamily: 'Space Grotesk', enabled: true, url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap' })
  };

  if (!pool) {
    return defaultSettings;
  }

  try {
    const result = await pool.query(`
      SELECT 
        id,
        site_name_en, site_name_ar, site_description_en, site_description_ar,
        seo_description_en, seo_description_ar, keywords_en, keywords_ar,
        google_analytics_id, google_site_verification, logo_url, logo_light_url, favicon_url, seo_image_url,
        stripe_status, stripe_last_verified_at, stripe_publishable_key, stripe_secret_key, stripe_webhook_secret, stripe_live_mode,
        paypal_status, paypal_last_verified_at, paypal_client_id, paypal_client_secret, paypal_mode, image_prompt_pref_threshold,
        blocked_paths, seo_site_name_en, seo_site_name_ar,
        font_loading_config, font_config_ar, font_config_en
      FROM system_settings 
      ORDER BY id ASC
      LIMIT 1
    `);

    let settings = result.rows[0];
    if (!settings) {
      await pool.query(`
        INSERT INTO system_settings (site_name_en, site_name_ar, logo_url, logo_light_url, favicon_url)
        VALUES ('Perplexta', 'بيربلكستا', null, null, null)
      `).catch(() => {});
      settings = defaultSettings;
    }

    if (!settings.font_loading_config) {
      settings.font_loading_config = defaultSettings.font_loading_config;
    }
    if (!settings.font_config_ar) {
      settings.font_config_ar = defaultSettings.font_config_ar;
    }
    if (!settings.font_config_en) {
      settings.font_config_en = defaultSettings.font_config_en;
    }

    if (settings.stripe_publishable_key) {
      settings.stripe_publishable_key = safeDecrypt(settings.stripe_publishable_key, '');
    }
    if (settings.stripe_secret_key) {
      settings.stripe_secret_key = safeDecrypt(settings.stripe_secret_key, '');
    }
    if (settings.stripe_webhook_secret) {
      settings.stripe_webhook_secret = safeDecrypt(settings.stripe_webhook_secret, '');
    }
    if (settings.paypal_client_id) {
      settings.paypal_client_id = safeDecrypt(settings.paypal_client_id, '');
    }
    if (settings.paypal_client_secret) {
      settings.paypal_client_secret = safeDecrypt(settings.paypal_client_secret, '');
    }

    systemSettingsCache.set('global', { data: settings, timestamp: now });
    return settings;
  } catch (err: any) {
    console.warn('[Queries] getCachedSystemSettings query failed, returning defaults:', err.message);
    return defaultSettings;
  }
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

  const defaultSettings: any = {
    points_per_dollar:               1000,
    min_payout_usd:                  10,
    min_deposit_usd:                 5,
    referral_bonus_percent:          10,
    welcome_bonus_points:            600,
    referral_bonus_points:           1000,
    conversion_rate:                 0.001,
    min_withdrawal_cents:            1000,
    referral_activation_min_deposit: 10,
    crypto_address:  '',
    bank_name:       '',
    bank_recipient:  '',
    bank_iban:       '',
    bank_swift:      '',
    paypal_email:    '',
  };

  const target = ledgerPool || pool;
  if (!target) {
    return defaultSettings;
  }

  try {
    const res = await target.query('SELECT * FROM economy_settings LIMIT 1');

    let settings: any;
    if (res.rows.length > 0) {
      settings = { ...res.rows[0] };
    } else {
      settings = defaultSettings;
    }

    settings.crypto_address  = safeDecrypt(settings.crypto_address,  '');
    settings.bank_name       = safeDecrypt(settings.bank_name,       '');
    settings.bank_recipient  = safeDecrypt(settings.bank_recipient,  '');
    settings.bank_iban       = safeDecrypt(settings.bank_iban,       '');
    settings.bank_swift      = safeDecrypt(settings.bank_swift,      '');
    settings.paypal_email    = safeDecrypt(settings.paypal_email,    '');

    economySettingsCache.set('global', { data: settings, timestamp: now });
    return settings;
  } catch (err: any) {
    console.warn('[Queries] getCachedEconomySettings query failed, returning defaults:', err.message);
    return defaultSettings;
  }
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

  if (!pool) return null;
  try {
    const res = await pool.query('SELECT * FROM tool_orchestrator WHERE tool_id = $1 AND is_active = true', [toolId]);
    const config = res.rows[0] || null;

    orchestratorConfigCache.set(toolId, { data: config, timestamp: now });
    return config;
  } catch (err: any) {
    console.warn('[Queries] getCachedOrchestratorConfig failed:', err.message);
    return null;
  }
}

export function invalidateOrchestratorConfigCache(toolId?: string) {
  if (toolId) {
    orchestratorConfigCache.delete(toolId);
  } else {
    orchestratorConfigCache.clear();
  }
}

/** Get active subscription plans from cache */
export async function getCachedActivePlans(): Promise<any[]> {
  const now = Date.now();
  const cached = activePlansCache.get('global');
  if (cached && now - cached.timestamp < TTL_PLANS) {
    return cached.data;
  }

  if (!pool) return [];
  try {
    const res = await pool.query('SELECT * FROM plans ORDER BY price_monthly ASC');
    const plans = res.rows;

    activePlansCache.set('global', { data: plans, timestamp: now });
    return plans;
  } catch (err: any) {
    console.warn('[Queries] getCachedActivePlans failed:', err.message);
    return [];
  }
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

  if (!pool) return [];
  try {
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
  } catch (err: any) {
    console.warn('[Queries] getCachedApiKeysVault failed:', err.message);
    return [];
  }
}

export function invalidateApiKeysVaultCache() {
  apiKeysVaultCache.delete('global');
}

const seoNodeCache = new NodeCache({ stdTTL: 120, checkperiod: 15 });

// Custom per-route hit/miss metrics tracker
interface CacheStats {
  hits: number;
  misses: number;
}

const seoRouteStats = new Map<string, CacheStats>();

function trackSeoCache(route: string, type: string, isHit: boolean) {
  let stats = seoRouteStats.get(route);
  if (!stats) {
    stats = { hits: 0, misses: 0 };
    seoRouteStats.set(route, stats);
  }
  if (isHit) {
    stats.hits++;
  } else {
    stats.misses++;
  }

  const total = stats.hits + stats.misses;
  const hitRatio = ((stats.hits / total) * 100).toFixed(1);

  // Get node-cache global stats
  const globalStats = seoNodeCache.getStats();
  const globalTotal = globalStats.hits + globalStats.misses;
  const globalHitRatio = globalTotal > 0 ? ((globalStats.hits / globalTotal) * 100).toFixed(1) : '0.0';

  console.log(
    `\x1b[35m[SEO Cache Metrics]\x1b[0m Route: "\x1b[33m${route}\x1b[0m" | Type: \x1b[36m${type}\x1b[0m | Result: ${isHit ? '\x1b[32mHIT (Memory)\x1b[0m' : '\x1b[31mMISS (DB)\x1b[0m'} | ` +
    `Route Efficiency: \x1b[32m${hitRatio}%\x1b[0m (Hits: ${stats.hits}, Misses: ${stats.misses}) | ` +
    `Overall Cache Efficiency: \x1b[36m${globalHitRatio}%\x1b[0m (Total Hits: ${globalStats.hits}, Total Misses: ${globalStats.misses})`
  );
}

/** Get cached SEO settings for a specific route */
export async function getCachedRouteSeo(route: string): Promise<any> {
  const cached = seoNodeCache.get<any>(`route:${route}`);
  if (cached !== undefined) {
    trackSeoCache(route, 'Settings', true);
    return cached;
  }

  trackSeoCache(route, 'Settings', false);
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT * FROM route_seo_settings WHERE route = $1 AND is_active = true LIMIT 1',
      [route]
    );
    const data = result.rows[0] || null;
    seoNodeCache.set(`route:${route}`, data);
    return data;
  } catch (err: any) {
    console.warn('[Queries] getCachedRouteSeo failed:', err.message);
    return null;
  }
}

/** Get cached SEO metadata for a specific route */
export async function getCachedRouteSeoMetadata(routePath: string): Promise<any> {
  const cached = seoNodeCache.get<any>(`meta:${routePath}`);
  if (cached !== undefined) {
    trackSeoCache(routePath, 'Metadata', true);
    return cached;
  }

  trackSeoCache(routePath, 'Metadata', false);
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT * FROM route_seo_metadata WHERE route_path = $1 LIMIT 1',
      [routePath]
    );
    const data = result.rows[0] || null;
    seoNodeCache.set(`meta:${routePath}`, data);
    return data;
  } catch (err: any) {
    console.warn('[Queries] getCachedRouteSeoMetadata failed:', err.message);
    return null;
  }
}

/** Get cached list of all active route SEO settings */
export async function getCachedAllActiveRouteSeo(): Promise<any[]> {
  const cached = seoNodeCache.get<any[]>('all_active');
  if (cached !== undefined) {
    trackSeoCache('all_active', 'AllActiveList', true);
    return cached;
  }

  trackSeoCache('all_active', 'AllActiveList', false);
  if (!pool) return [];
  try {
    const result = await pool.query('SELECT * FROM route_seo_settings WHERE is_active = true ORDER BY id ASC');
    const data = result.rows;
    seoNodeCache.set('all_active', data);
    return data;
  } catch (err: any) {
    console.warn('[Queries] getCachedAllActiveRouteSeo failed:', err.message);
    return [];
  }
}

/** Get cached Open Graph preview cache for social media / SSR */
export async function getCachedOgPreview(routePath: string): Promise<any> {
  const normalized = routePath === '/' ? '/' : routePath.replace(/\/$/, '');
  const cached = seoNodeCache.get<any>(`og_preview:${normalized}`);
  if (cached !== undefined) {
    return cached;
  }

  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT title, description, image_url, meta_data FROM og_preview_cache WHERE route_path = $1 LIMIT 1',
      [normalized]
    );
    const data = result.rows[0] || null;
    seoNodeCache.set(`og_preview:${normalized}`, data);
    return data;
  } catch {
    return null;
  }
}

/** Invalidate entire route SEO cache */
export function invalidateRouteSeoCache(routePath?: string) {
  if (routePath) {
    const normalized = routePath === '/' ? '/' : routePath.replace(/\/$/, '');
    seoNodeCache.del(`route:${normalized}`);
    seoNodeCache.del(`meta:${normalized}`);
    seoNodeCache.del(`dynamic_seo:${normalized}`);
    seoNodeCache.del(`og_preview:${normalized}`);
  } else {
    seoNodeCache.flushAll();
  }
}

/** Get cached SEO metadata for dynamic routes from seo_metadata table */
export async function getCachedSeoMetadata(routePath: string): Promise<any> {
  const normalizedPath = routePath === '/' ? '/' : (routePath || '/').replace(/\/$/, '');
  const cached = seoNodeCache.get<any>(`dynamic_seo:${normalizedPath}`);
  if (cached !== undefined) {
    trackSeoCache(normalizedPath, 'DynamicSeoMetadata', true);
    return cached;
  }

  trackSeoCache(normalizedPath, 'DynamicSeoMetadata', false);
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT * FROM seo_metadata WHERE route_path = $1 AND is_active = true LIMIT 1',
      [normalizedPath]
    );
    const data = result.rows[0] || null;
    seoNodeCache.set(`dynamic_seo:${normalizedPath}`, data);
    return data;
  } catch (err: any) {
    console.warn('[Queries] getCachedSeoMetadata failed:', err.message);
    return null;
  }
}

/** Upsert dynamic route SEO metadata into seo_metadata table */
export async function upsertSeoMetadata(data: {
  route_path: string;
  entity_type?: string;
  entity_id?: string;
  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
  og_image_url?: string;
  og_image_alt_en?: string;
  og_image_alt_ar?: string;
  keywords_en?: string;
  keywords_ar?: string;
  canonical_url?: string;
  structured_data?: any;
  is_active?: boolean;
}): Promise<any> {
  if (!pool) return null;
  const normalizedPath = data.route_path === '/' ? '/' : (data.route_path || '/').replace(/\/$/, '');
  try {
    const result = await pool.query(`
      INSERT INTO seo_metadata (
        route_path, entity_type, entity_id,
        title_en, title_ar, description_en, description_ar,
        og_image_url, og_image_alt_en, og_image_alt_ar,
        keywords_en, keywords_ar, canonical_url, structured_data, is_active, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
      ON CONFLICT (route_path) DO UPDATE SET
        entity_type = COALESCE(EXCLUDED.entity_type, seo_metadata.entity_type),
        entity_id = COALESCE(EXCLUDED.entity_id, seo_metadata.entity_id),
        title_en = COALESCE(EXCLUDED.title_en, seo_metadata.title_en),
        title_ar = COALESCE(EXCLUDED.title_ar, seo_metadata.title_ar),
        description_en = COALESCE(EXCLUDED.description_en, seo_metadata.description_en),
        description_ar = COALESCE(EXCLUDED.description_ar, seo_metadata.description_ar),
        og_image_url = COALESCE(EXCLUDED.og_image_url, seo_metadata.og_image_url),
        og_image_alt_en = COALESCE(EXCLUDED.og_image_alt_en, seo_metadata.og_image_alt_en),
        og_image_alt_ar = COALESCE(EXCLUDED.og_image_alt_ar, seo_metadata.og_image_alt_ar),
        keywords_en = COALESCE(EXCLUDED.keywords_en, seo_metadata.keywords_en),
        keywords_ar = COALESCE(EXCLUDED.keywords_ar, seo_metadata.keywords_ar),
        canonical_url = COALESCE(EXCLUDED.canonical_url, seo_metadata.canonical_url),
        structured_data = COALESCE(EXCLUDED.structured_data, seo_metadata.structured_data),
        is_active = COALESCE(EXCLUDED.is_active, seo_metadata.is_active),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      normalizedPath,
      data.entity_type || 'custom',
      data.entity_id || null,
      data.title_en || null,
      data.title_ar || null,
      data.description_en || null,
      data.description_ar || null,
      data.og_image_url || null,
      data.og_image_alt_en || null,
      data.og_image_alt_ar || null,
      data.keywords_en || null,
      data.keywords_ar || null,
      data.canonical_url || null,
      JSON.stringify(data.structured_data || {}),
      data.is_active !== false
    ]);
    seoNodeCache.del(`dynamic_seo:${normalizedPath}`);
    return result.rows[0];
  } catch (err: any) {
    console.warn('[Queries] upsertSeoMetadata failed:', err.message);
    return null;
  }
}

/** Get list of all dynamic SEO metadata records */
export async function getAllSeoMetadata(filters?: { entity_type?: string; limit?: number; offset?: number }): Promise<any[]> {
  if (!pool) return [];
  try {
    let query = 'SELECT * FROM seo_metadata';
    const params: any[] = [];
    if (filters?.entity_type) {
      params.push(filters.entity_type);
      query += ` WHERE entity_type = $${params.length}`;
    }
    query += ' ORDER BY updated_at DESC';
    if (filters?.limit) {
      params.push(filters.limit);
      query += ` LIMIT $${params.length}`;
    }
    if (filters?.offset) {
      params.push(filters.offset);
      query += ` OFFSET $${params.length}`;
    }
    const res = await pool.query(query, params);
    return res.rows;
  } catch (err: any) {
    console.warn('[Queries] getAllSeoMetadata failed:', err.message);
    return [];
  }
}

/** Delete a dynamic SEO metadata record */
export async function deleteSeoMetadata(id: number | string): Promise<boolean> {
  if (!pool) return false;
  try {
    const res = await pool.query('DELETE FROM seo_metadata WHERE id = $1 RETURNING route_path', [id]);
    if (res.rows[0]?.route_path) {
      seoNodeCache.del(`dynamic_seo:${res.rows[0].route_path}`);
    }
    return (res.rowCount || 0) > 0;
  } catch (err: any) {
    console.warn('[Queries] deleteSeoMetadata failed:', err.message);
    return false;
  }
}

