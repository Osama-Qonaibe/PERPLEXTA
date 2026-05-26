import { pool } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';
import { getEconomySettings, updateEconomySettings } from './wallet.js';

export { getEconomySettings, updateEconomySettings };

let cachedAppNameEn = '';
let cachedAppNameAr = '';

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
  const result = await pool.query(`
    SELECT 
      site_name_en, site_name_ar, site_description_en, site_description_ar,
      seo_description_en, seo_description_ar, keywords_en, keywords_ar,
      google_analytics_id, logo_url, favicon_url, seo_image_url,
      stripe_status, stripe_last_verified_at, stripe_publishable_key, stripe_live_mode,
      paypal_status, paypal_last_verified_at, paypal_client_id, paypal_mode
    FROM system_settings LIMIT 1
  `);
  
  const settings = result.rows[0] || {};
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
  return settings;
}

export async function updateSystemSettings(settings: any) {
  let seo_description_en = settings.seo_description_en;
  let seo_description_ar = settings.seo_description_ar;
  let keywords_en = settings.keywords_en;
  let keywords_ar = settings.keywords_ar;

  // Gracefully adopt nested JSON object or string format if sent from Admin Dashboard
  if (settings.seo_description) {
    try {
      const parsedSeo = typeof settings.seo_description === 'string' 
        ? JSON.parse(settings.seo_description) 
        : settings.seo_description;
      if (parsedSeo.en) seo_description_en = parsedSeo.en;
      if (parsedSeo.ar) seo_description_ar = parsedSeo.ar;
    } catch (e) {
      console.warn('[System] Failed to parse nested seo_description:', e);
    }
  }

  if (settings.keywords) {
    try {
      const parsedKeywords = typeof settings.keywords === 'string' 
        ? JSON.parse(settings.keywords) 
        : settings.keywords;
      if (parsedKeywords.en) keywords_en = parsedKeywords.en;
      if (parsedKeywords.ar) keywords_ar = parsedKeywords.ar;
    } catch (e) {
      console.warn('[System] Failed to parse nested keywords:', e);
    }
  }

  const { 
    site_name_en, site_name_ar, site_description_en, site_description_ar,
    google_analytics_id, logo_url, favicon_url, seo_image_url
  } = settings;
  
  await pool.query(`
    UPDATE system_settings SET 
      site_name_en = $1, site_name_ar = $2, site_description_en = $3, site_description_ar = $4,
      seo_description_en = $5, seo_description_ar = $6, keywords_en = $7, keywords_ar = $8,
      google_analytics_id = $9, logo_url = $10, favicon_url = $11, seo_image_url = $12, updated_at = CURRENT_TIMESTAMP
  `, [
    site_name_en, site_name_ar, site_description_en, site_description_ar,
    seo_description_en || '', seo_description_ar || '', keywords_en || '', keywords_ar || '',
    google_analytics_id, logo_url, favicon_url, seo_image_url
  ]);
  
  await refreshCachedAppName();
  return { success: true };
}

export const getAppName = (lang: 'en' | 'ar' = 'en') => lang === 'ar' ? cachedAppNameAr : cachedAppNameEn;
