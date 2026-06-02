import { pool } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';
import { getEconomySettings, updateEconomySettings } from './wallet.js';

export { getEconomySettings, updateEconomySettings };

let cachedAppNameEn = '';
let cachedAppNameAr = '';

let cachedSettings: any = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 300000; // 5 minutes in-memory cache

export async function clearSettingsCache() {
  cachedSettings = null;
  settingsCacheTime = 0;
}

export async function refreshCachedAppName() {
  try {
    const res = await pool.query('SELECT site_name_en, site_name_ar FROM system_settings LIMIT 1');
    if (res.rows.length > 0) {
      cachedAppNameEn = res.rows[0].site_name_en || '';
      cachedAppNameAr = res.rows[0].site_name_ar || '';
    }
  } catch (e) {
    console.error('[System] Failed to refresh cached app name:', e);
  }
}

export async function getSystemSettings() {
  const now = Date.now();
  if (cachedSettings && (now - settingsCacheTime < SETTINGS_CACHE_TTL)) {
    return cachedSettings;
  }

  try {
    const result = await pool.query(`
      SELECT 
        site_name_en, site_name_ar, site_description_en, site_description_ar,
        seo_description_en, seo_description_ar, keywords_en, keywords_ar,
        google_analytics_id, google_site_verification, logo_url, logo_light_url, favicon_url, seo_image_url,
        stripe_status, stripe_last_verified_at, stripe_publishable_key, stripe_live_mode,
        paypal_status, paypal_last_verified_at, paypal_client_id, paypal_mode
      FROM system_settings LIMIT 1
    `);
    
    let settings = result.rows[0];

    // Seed default if database table is completely empty
    if (!settings) {
      console.log('[SystemSettings] Table system_settings is empty. Seeding default row...');
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
          paypal_status, paypal_last_verified_at, paypal_client_id, paypal_mode
        FROM system_settings LIMIT 1
      `);
      settings = secondTry.rows[0];
    }
    
    if (settings.stripe_publishable_key) {
      try {
        settings.stripe_publishable_key = decrypt(settings.stripe_publishable_key);
      } catch (e) {
        console.warn('[System] Failed to decrypt stripe_publishable_key:', e);
      }
    }
    if (settings.paypal_client_id) {
      try {
        settings.paypal_client_id = decrypt(settings.paypal_client_id);
      } catch (e) {
        console.warn('[System] Failed to decrypt paypal_client_id:', e);
      }
    }

    cachedSettings = settings;
    settingsCacheTime = now;
    return settings;
  } catch (err: any) {
    const errMsg = err.message || '';
    if (errMsg.includes('relation "system_settings" does not exist')) {
      console.log('[SystemSettings] system_settings table does not exist. Running migrations dynamically...');
      try {
        const { runDatabaseMigrations } = await import('../db/migrations.js');
        await runDatabaseMigrations();
        return getSystemSettings();
      } catch (innerErr: any) {
        console.error('[SystemSettings] Dynamic migration running failed:', innerErr.message);
      }
    } else if (errMsg.includes('logo_light_url')) {
      console.log('[SystemSettings] logo_light_url column seems to be missing. Attempting dynamic self-healing...');
      try {
        await pool.query('ALTER TABLE system_settings ADD COLUMN logo_light_url TEXT');
        console.log('[SystemSettings] Successfully added logo_light_url dynamically!');
        return getSystemSettings();
      } catch (innerErr: any) {
        console.error('[SystemSettings] Dynamic column addition failed:', innerErr.message);
      }
    }
    throw err;
  }
}

export async function updateSystemSettings(settings: any) {
  const existing = await getSystemSettings();

  let seo_description_en = settings.seo_description_en !== undefined ? settings.seo_description_en : existing.seo_description_en;
  let seo_description_ar = settings.seo_description_ar !== undefined ? settings.seo_description_ar : existing.seo_description_ar;
  let keywords_en = settings.keywords_en !== undefined ? settings.keywords_en : existing.keywords_en;
  let keywords_ar = settings.keywords_ar !== undefined ? settings.keywords_ar : existing.keywords_ar;

  // Gracefully adopt nested JSON object or string format if sent from Admin Dashboard
  if (settings.seo_description) {
    try {
      const parsedSeo = typeof settings.seo_description === 'string' 
        ? JSON.parse(settings.seo_description) 
        : settings.seo_description;
      if (parsedSeo.en !== undefined) seo_description_en = parsedSeo.en;
      if (parsedSeo.ar !== undefined) seo_description_ar = parsedSeo.ar;
    } catch (e) {
      console.warn('[System] Failed to parse nested seo_description:', e);
    }
  }

  if (settings.keywords) {
    try {
      const parsedKeywords = typeof settings.keywords === 'string' 
        ? JSON.parse(settings.keywords) 
        : settings.keywords;
      if (parsedKeywords.en !== undefined) keywords_en = parsedKeywords.en;
      if (parsedKeywords.ar !== undefined) keywords_ar = parsedKeywords.ar;
    } catch (e) {
      console.warn('[System] Failed to parse nested keywords:', e);
    }
  }

  const site_name_en = settings.site_name_en !== undefined ? settings.site_name_en : existing.site_name_en;
  const site_name_ar = settings.site_name_ar !== undefined ? settings.site_name_ar : existing.site_name_ar;
  const site_description_en = settings.site_description_en !== undefined ? settings.site_description_en : existing.site_description_en;
  const site_description_ar = settings.site_description_ar !== undefined ? settings.site_description_ar : existing.site_description_ar;

  const google_analytics_id = settings.google_analytics_id !== undefined ? settings.google_analytics_id : existing.google_analytics_id;
  const google_site_verification = settings.google_site_verification !== undefined ? settings.google_site_verification : existing.google_site_verification;

  // Prevent logo_url, favicon_url, or seo_image_url from being reset to NULL/empty if not supplied or if null/empty in partial updates
  const logo_url = (settings.logo_url !== undefined && settings.logo_url !== null && settings.logo_url !== '') 
    ? settings.logo_url 
    : existing.logo_url;
  const logo_light_url = (settings.logo_light_url !== undefined && settings.logo_light_url !== null && settings.logo_light_url !== '') 
    ? settings.logo_light_url 
    : existing.logo_light_url;
  const favicon_url = (settings.favicon_url !== undefined && settings.favicon_url !== null && settings.favicon_url !== '') 
    ? settings.favicon_url 
    : existing.favicon_url;
  const seo_image_url = (settings.seo_image_url !== undefined && settings.seo_image_url !== null && settings.seo_image_url !== '') 
    ? settings.seo_image_url 
    : existing.seo_image_url;
  
  await pool.query(`
    UPDATE system_settings SET 
      site_name_en = $1, site_name_ar = $2, site_description_en = $3, site_description_ar = $4,
      seo_description_en = $5, seo_description_ar = $6, keywords_en = $7, keywords_ar = $8,
      google_analytics_id = $9, google_site_verification = $10, logo_url = $11, logo_light_url = $12, favicon_url = $13, seo_image_url = $14, updated_at = CURRENT_TIMESTAMP
  `, [
    site_name_en, site_name_ar, site_description_en, site_description_ar,
    seo_description_en || '', seo_description_ar || '', keywords_en || '', keywords_ar || '',
    google_analytics_id, google_site_verification, logo_url, logo_light_url, favicon_url, seo_image_url
  ]);
  
  await clearSettingsCache();
  await refreshCachedAppName();
  return { success: true };
}

export const getAppName = (lang: 'en' | 'ar' = 'en') => lang === 'ar' ? cachedAppNameAr : cachedAppNameEn;
