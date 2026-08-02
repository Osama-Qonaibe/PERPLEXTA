import { pool } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';
import { getEconomySettings, updateEconomySettings } from './wallet.js';
import { getCachedSystemSettings, invalidateSystemSettingsCache } from '../db/queries.js';

export { getEconomySettings, updateEconomySettings };

let cachedAppNameEn = '';
let cachedAppNameAr = '';

export async function clearSettingsCache() {
  invalidateSystemSettingsCache();
}

export async function refreshCachedAppName() {
  try {
    const settings = await getCachedSystemSettings();
    if (settings) {
      cachedAppNameEn = settings.site_name_en || '';
      cachedAppNameAr = settings.site_name_ar || '';
    }
  } catch (e) {
    console.error('[System] Failed to refresh cached app name:', e);
  }
}

export async function getSystemSettings() {
  try {
    return await getCachedSystemSettings();
  } catch (err: any) {
    const errMsg = err.message || '';
    if (errMsg.includes('relation "system_settings" does not exist')) {
      console.log('[SystemSettings] system_settings table does not exist. Running migrations dynamically...');
      try {
        const { runDatabaseMigrations } = await import('../db/migrations.js');
        await runDatabaseMigrations();
        invalidateSystemSettingsCache();
        return getCachedSystemSettings();
      } catch (innerErr: any) {
        console.error('[SystemSettings] Dynamic migration running failed:', innerErr.message);
      }
    } else if (errMsg.includes('logo_light_url')) {
      console.log('[SystemSettings] logo_light_url column seems to be missing. Attempting dynamic self-healing...');
      try {
        await pool.query('ALTER TABLE system_settings ADD COLUMN logo_light_url TEXT');
        console.log('[SystemSettings] Successfully added logo_light_url dynamically!');
        invalidateSystemSettingsCache();
        return getCachedSystemSettings();
      } catch (innerErr: any) {
        console.error('[SystemSettings] Dynamic column addition failed:', innerErr.message);
      }
    } else if (errMsg.includes('blocked_paths')) {
      console.log('[SystemSettings] blocked_paths column seems to be missing. Attempting dynamic self-healing...');
      try {
        await pool.query("ALTER TABLE system_settings ADD COLUMN blocked_paths TEXT DEFAULT ''");
        console.log('[SystemSettings] Successfully added blocked_paths dynamically!');
        invalidateSystemSettingsCache();
        return getCachedSystemSettings();
      } catch (innerErr: any) {
        console.error('[SystemSettings] Dynamic blocked_paths column addition failed:', innerErr.message);
      }
    } else if (errMsg.includes('font_loading_config')) {
      console.log('[SystemSettings] font_loading_config column seems to be missing. Attempting dynamic self-healing...');
      try {
        await pool.query("ALTER TABLE system_settings ADD COLUMN font_loading_config TEXT");
        await pool.query("ALTER TABLE system_settings ADD COLUMN font_config_ar TEXT");
        await pool.query("ALTER TABLE system_settings ADD COLUMN font_config_en TEXT");
        console.log('[SystemSettings] Successfully added font config columns dynamically!');
        invalidateSystemSettingsCache();
        return getCachedSystemSettings();
      } catch (innerErr: any) {
        console.error('[SystemSettings] Dynamic font config column addition failed:', innerErr.message);
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

  let seo_site_name_en = settings.seo_site_name_en !== undefined ? settings.seo_site_name_en : existing.seo_site_name_en;
  let seo_site_name_ar = settings.seo_site_name_ar !== undefined ? settings.seo_site_name_ar : existing.seo_site_name_ar;

  // Gracefully adopt nested JSON object or string format if sent from Admin Dashboard
  if (settings.seo_site_name) {
    try {
      const parsedTitle = typeof settings.seo_site_name === 'string'
        ? JSON.parse(settings.seo_site_name)
        : settings.seo_site_name;
      if (parsedTitle.en !== undefined) seo_site_name_en = parsedTitle.en;
      if (parsedTitle.ar !== undefined) seo_site_name_ar = parsedTitle.ar;
    } catch (e) {
      console.warn('[System] Failed to parse nested seo_site_name:', e);
    }
  }

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
  const blocked_paths = settings.blocked_paths !== undefined ? settings.blocked_paths : (existing.blocked_paths || '');

  const bulletin_ad_daily_price = settings.bulletin_ad_daily_price !== undefined ? settings.bulletin_ad_daily_price : (existing.bulletin_ad_daily_price || 5.00);
  const live_gift_commission_percent = settings.live_gift_commission_percent !== undefined ? settings.live_gift_commission_percent : (existing.live_gift_commission_percent || 30);
  const sidebar_ad_impression_price = settings.sidebar_ad_impression_price !== undefined ? settings.sidebar_ad_impression_price : (existing.sidebar_ad_impression_price || 0.0100);
  const sidebar_ad_click_price = settings.sidebar_ad_click_price !== undefined ? settings.sidebar_ad_click_price : (existing.sidebar_ad_click_price || 0.10);

  let font_loading_config = settings.font_loading_config !== undefined 
    ? (typeof settings.font_loading_config === 'object' ? JSON.stringify(settings.font_loading_config) : settings.font_loading_config)
    : existing.font_loading_config;

  let font_config_ar = settings.font_config_ar !== undefined 
    ? (typeof settings.font_config_ar === 'object' ? JSON.stringify(settings.font_config_ar) : settings.font_config_ar)
    : existing.font_config_ar;

  let font_config_en = settings.font_config_en !== undefined 
    ? (typeof settings.font_config_en === 'object' ? JSON.stringify(settings.font_config_en) : settings.font_config_en)
    : existing.font_config_en;

  if (settings.fontConfig) {
    try {
      const parsedFC = typeof settings.fontConfig === 'string' ? JSON.parse(settings.fontConfig) : settings.fontConfig;
      font_loading_config = JSON.stringify(parsedFC);
      if (parsedFC.ar) font_config_ar = JSON.stringify(parsedFC.ar);
      if (parsedFC.en) font_config_en = JSON.stringify(parsedFC.en);
    } catch (e) {
      console.warn('[System] Failed to parse fontConfig payload:', e);
    }
  }

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
      google_analytics_id = $9, google_site_verification = $10, logo_url = $11, logo_light_url = $12, favicon_url = $13, seo_image_url = $14,
      blocked_paths = $15, seo_site_name_en = $16, seo_site_name_ar = $17, 
      bulletin_ad_daily_price = $18, live_gift_commission_percent = $19, 
      sidebar_ad_impression_price = $20, sidebar_ad_click_price = $21,
      font_loading_config = $22, font_config_ar = $23, font_config_en = $24,
      updated_at = CURRENT_TIMESTAMP
  `, [
    site_name_en, site_name_ar, site_description_en, site_description_ar,
    seo_description_en || '', seo_description_ar || '', keywords_en || '', keywords_ar || '',
    google_analytics_id, google_site_verification, logo_url, logo_light_url, favicon_url, seo_image_url,
    blocked_paths, seo_site_name_en || '', seo_site_name_ar || '',
    bulletin_ad_daily_price, live_gift_commission_percent,
    sidebar_ad_impression_price, sidebar_ad_click_price,
    font_loading_config, font_config_ar, font_config_en
  ]);
  
  await clearSettingsCache();
  await refreshCachedAppName();
  return { success: true };
}

export const getAppName = (lang: 'en' | 'ar' = 'en') => lang === 'ar' ? cachedAppNameAr : cachedAppNameEn;
