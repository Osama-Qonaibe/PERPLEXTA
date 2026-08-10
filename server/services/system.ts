import fs from 'fs';
import path from 'path';
import { pool } from '../db/index.js';
import { decrypt } from '../utils/crypto.js';
import { getEconomySettings, updateEconomySettings } from './wallet.js';
import { getCachedSystemSettings, invalidateSystemSettingsCache } from '../db/queries.js';
import { normalizeMediaUrl } from './mediaOptimizationService.js';

export { getEconomySettings, updateEconomySettings };

let cachedAppNameEn = '';
let cachedAppNameAr = '';

export async function clearSettingsCache() {
  invalidateSystemSettingsCache();
}

export async function ensurePersistentSystemAssets(settings: any) {
  if (!settings) return;
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fields = [
      { key: 'logo_url', name: 'logo' },
      { key: 'logo_light_url', name: 'logo_light' },
      { key: 'favicon_url', name: 'favicon' },
      { key: 'seo_image_url', name: 'seo_image' }
    ];

    for (const field of fields) {
      const val = settings[field.key];
      if (!val || typeof val !== 'string') continue;

      if (val.startsWith('data:image/')) {
        try {
          const match = val.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (match) {
            const rawExt = match[1].toLowerCase();
            const ext = rawExt === 'jpeg' ? 'jpg' : (rawExt === 'svg+xml' ? 'svg' : rawExt);
            const buffer = Buffer.from(match[2], 'base64');
            const filename = `system_${field.name}.${ext}`;
            const targetPath = path.join(uploadsDir, filename);
            await fs.promises.writeFile(targetPath, buffer);
            console.log(`[SystemAssets] Hard-wrote persistent base64 asset to disk: ${filename}`);
          }
        } catch (e: any) {
          console.error(`[SystemAssets] Error writing base64 asset for ${field.key}:`, e.message);
        }
      } else if (val.startsWith('/uploads/') || val.startsWith('uploads/')) {
        const cleanName = path.basename(val.split('?')[0]);
        const targetPath = path.join(uploadsDir, cleanName);
        if (!fs.existsSync(targetPath)) {
          console.warn(`[SystemAssets] Asset file missing from disk: ${cleanName}, restoring persistent fallback...`);
          const defaultAppIcon = path.join(process.cwd(), 'public', 'app-assets', 'icon.png');
          if (fs.existsSync(defaultAppIcon)) {
            await fs.promises.copyFile(defaultAppIcon, targetPath).catch(() => {});
            console.log(`[SystemAssets] Created persistent disk fallback for missing asset: ${cleanName}`);
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[SystemAssets] Error ensuring persistent assets:', err.message);
  }
}

export async function refreshCachedAppName() {
  try {
    const settings = await getCachedSystemSettings();
    if (settings) {
      cachedAppNameEn = settings.site_name_en || '';
      cachedAppNameAr = settings.site_name_ar || '';
      ensurePersistentSystemAssets(settings).catch(() => {});
    }
  } catch (e) {
    console.error('[System] Failed to refresh cached app name:', e);
  }
}

export async function getSystemSettings() {
  try {
    const settings = await getCachedSystemSettings();
    if (settings) {
      ensurePersistentSystemAssets(settings).catch(() => {});
    }
    return settings;
  } catch (err: any) {
    const errMsg = err.message || '';
    if (errMsg.includes('relation "system_settings" does not exist') || 
        errMsg.includes('logo_light_url') || 
        errMsg.includes('blocked_paths') || 
        errMsg.includes('font_loading_config')) {
      console.log('[SystemSettings] Schema anomaly or missing column detected. Triggering database migrations...');
      try {
        const { runDatabaseMigrations } = await import('../db/migrations.js');
        await runDatabaseMigrations();
        invalidateSystemSettingsCache();
        return getCachedSystemSettings();
      } catch (innerErr: any) {
        console.error('[SystemSettings] Dynamic migration running failed:', innerErr.message);
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

  const quota_warning_threshold_low = settings.quota_warning_threshold_low !== undefined 
    ? Number(settings.quota_warning_threshold_low) 
    : (existing?.quota_warning_threshold_low ?? 50);

  const quota_warning_threshold_high = settings.quota_warning_threshold_high !== undefined 
    ? Number(settings.quota_warning_threshold_high) 
    : (existing?.quota_warning_threshold_high ?? 80);

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

  // Handle image URLs cleanly: if key is in payload (even if null/empty), update it (allowing deletion); if undefined, preserve existing.
  const logo_url = (settings.logo_url !== undefined)
    ? (settings.logo_url && String(settings.logo_url).trim() !== '' 
        ? (String(settings.logo_url).startsWith('data:') ? String(settings.logo_url) : normalizeMediaUrl(String(settings.logo_url))) 
        : null)
    : (existing ? existing.logo_url : null);

  const logo_light_url = (settings.logo_light_url !== undefined)
    ? (settings.logo_light_url && String(settings.logo_light_url).trim() !== '' 
        ? (String(settings.logo_light_url).startsWith('data:') ? String(settings.logo_light_url) : normalizeMediaUrl(String(settings.logo_light_url))) 
        : null)
    : (existing ? existing.logo_light_url : null);

  const favicon_url = (settings.favicon_url !== undefined)
    ? (settings.favicon_url && String(settings.favicon_url).trim() !== '' 
        ? (String(settings.favicon_url).startsWith('data:') ? String(settings.favicon_url) : normalizeMediaUrl(String(settings.favicon_url))) 
        : null)
    : (existing ? existing.favicon_url : null);

  const seo_image_url = (settings.seo_image_url !== undefined)
    ? (settings.seo_image_url && String(settings.seo_image_url).trim() !== '' 
        ? (String(settings.seo_image_url).startsWith('data:') ? String(settings.seo_image_url) : normalizeMediaUrl(String(settings.seo_image_url))) 
        : null)
    : (existing ? existing.seo_image_url : null);
  
  await pool.query(`
    UPDATE system_settings SET 
      site_name_en = $1, site_name_ar = $2, site_description_en = $3, site_description_ar = $4,
      seo_description_en = $5, seo_description_ar = $6, keywords_en = $7, keywords_ar = $8,
      google_analytics_id = $9, google_site_verification = $10, logo_url = $11, logo_light_url = $12, favicon_url = $13, seo_image_url = $14,
      blocked_paths = $15, seo_site_name_en = $16, seo_site_name_ar = $17, 
      bulletin_ad_daily_price = $18, live_gift_commission_percent = $19, 
      sidebar_ad_impression_price = $20, sidebar_ad_click_price = $21,
      font_loading_config = $22, font_config_ar = $23, font_config_en = $24,
      quota_warning_threshold_low = $25, quota_warning_threshold_high = $26,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $27
  `, [
    site_name_en, site_name_ar, site_description_en, site_description_ar,
    seo_description_en || '', seo_description_ar || '', keywords_en || '', keywords_ar || '',
    google_analytics_id, google_site_verification, logo_url, logo_light_url, favicon_url, seo_image_url,
    blocked_paths, seo_site_name_en || '', seo_site_name_ar || '',
    bulletin_ad_daily_price, live_gift_commission_percent,
    sidebar_ad_impression_price, sidebar_ad_click_price,
    font_loading_config, font_config_ar, font_config_en,
    quota_warning_threshold_low, quota_warning_threshold_high,
    existing.id
  ]);
  
  await clearSettingsCache();
  await refreshCachedAppName();
  await ensurePersistentSystemAssets({ logo_url, logo_light_url, favicon_url, seo_image_url });
  return { success: true };
}

export async function checkSystemAssetsDiagnostic() {
  const settings = await getCachedSystemSettings();
  if (!settings) {
    return {
      hasOrphanedAssets: false,
      assets: [],
      orphanedKeys: []
    };
  }

  const assetsToCheck = [
    { key: 'logo_url', label: 'Dark Logo (الشعار)' },
    { key: 'logo_light_url', label: 'Light Logo (الشعار الفاتح)' },
    { key: 'favicon_url', label: 'Favicon (أيقونة الموقع)' },
    { key: 'seo_image_url', label: 'SEO Cover Image (صورة المشاركة)' }
  ];

  const results: Array<{
    key: string;
    label: string;
    url: string | null;
    exists: boolean;
    isOrphaned: boolean;
    reason?: string;
  }> = [];

  let hasOrphaned = false;

  for (const item of assetsToCheck) {
    const url = settings[item.key];
    if (!url || typeof url !== 'string' || !url.trim()) {
      results.push({
        key: item.key,
        label: item.label,
        url: null,
        exists: true,
        isOrphaned: false
      });
      continue;
    }

    if (url.startsWith('data:image/')) {
      results.push({
        key: item.key,
        label: item.label,
        url: 'data:image/... (Embedded Base64)',
        exists: true,
        isOrphaned: false
      });
      continue;
    }

    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
      const cleanPath = url.split('?')[0].replace(/^\//, '');
      const absPath = path.join(process.cwd(), cleanPath);
      let fileExists = false;
      try {
        await fs.promises.access(absPath);
        fileExists = true;
      } catch {
        fileExists = false;
      }

      if (!fileExists) {
        hasOrphaned = true;
        results.push({
          key: item.key,
          label: item.label,
          url,
          exists: false,
          isOrphaned: true,
          reason: `File missing from server storage disk (${cleanPath})`
        });
      } else {
        results.push({
          key: item.key,
          label: item.label,
          url,
          exists: true,
          isOrphaned: false
        });
      }
    } else {
      results.push({
        key: item.key,
        label: item.label,
        url,
        exists: true,
        isOrphaned: false
      });
    }
  }

  return {
    hasOrphanedAssets: hasOrphaned,
    assets: results,
    orphanedKeys: results.filter(r => r.isOrphaned).map(r => r.key)
  };
}

export async function repairSystemAssetsDiagnostic() {
  const settings = await getCachedSystemSettings();
  if (!settings) {
    return { success: false, message: 'System settings not found' };
  }

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const defaultIconPath = path.join(process.cwd(), 'public', 'app-assets', 'icon.png');
  const fallbackIconExists = fs.existsSync(defaultIconPath);

  const assetsToCheck = [
    { key: 'logo_url', defaultName: 'system_logo.png' },
    { key: 'logo_light_url', defaultName: 'system_logo_light.png' },
    { key: 'favicon_url', defaultName: 'system_favicon.png' },
    { key: 'seo_image_url', defaultName: 'system_seo.png' }
  ];

  const updates: Record<string, string> = {};
  let repairedCount = 0;

  for (const item of assetsToCheck) {
    const url = settings[item.key];
    if (!url || typeof url !== 'string' || !url.trim()) continue;

    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
      const cleanPath = url.split('?')[0].replace(/^\//, '');
      const absPath = path.join(process.cwd(), cleanPath);
      let fileExists = false;
      try {
        await fs.promises.access(absPath);
        fileExists = true;
      } catch {
        fileExists = false;
      }

      if (!fileExists) {
        if (fallbackIconExists) {
          await fs.promises.copyFile(defaultIconPath, absPath).catch(() => {});
          console.log(`[AssetRepair] Restored missing disk file for ${item.key}: ${cleanPath}`);
          repairedCount++;
        } else {
          const newPath = `/uploads/${item.defaultName}`;
          const newAbs = path.join(uploadsDir, item.defaultName);
          const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
          await fs.promises.writeFile(newAbs, tinyPng).catch(() => {});
          updates[item.key] = newPath;
          repairedCount++;
        }
      }
    } else if (url.startsWith('data:image/')) {
      const match = url.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        const rawExt = match[1].toLowerCase();
        const ext = rawExt === 'jpeg' ? 'jpg' : (rawExt === 'svg+xml' ? 'svg' : rawExt);
        const buffer = Buffer.from(match[2], 'base64');
        const filename = `system_${item.key}.${ext}`;
        const targetPath = path.join(uploadsDir, filename);
        await fs.promises.writeFile(targetPath, buffer).catch(() => {});
        repairedCount++;
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    const setClause = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = Object.values(updates);
    await pool.query(`UPDATE system_settings SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = (SELECT id FROM system_settings ORDER BY id ASC LIMIT 1)`, values);
  }

  await clearSettingsCache();
  await refreshCachedAppName();
  const diagnosticAfter = await checkSystemAssetsDiagnostic();

  return {
    success: true,
    repairedCount,
    diagnostic: diagnosticAfter
  };
}

export const getAppName = (lang: 'en' | 'ar' = 'en') => lang === 'ar' ? cachedAppNameAr : cachedAppNameEn;

export async function getMissingAssetReport() {
  if (!pool) return { missingAssets: [], totalChecked: 0, missingCount: 0 };
  const filesRes = await pool.query(`
    SELECT id, user_id, chat_id, file_name, file_url, file_size, created_at 
    FROM user_files 
    ORDER BY created_at DESC
  `);

  const uploadDir = path.join(process.cwd(), 'uploads');
  const publicDir = path.join(process.cwd(), 'public');
  const rootDir = process.cwd();

  const missingAssets: any[] = [];
  for (const fileRow of filesRes.rows) {
    const fileUrl = fileRow.file_url;
    if (!fileUrl) {
      missingAssets.push({ ...fileRow, reason: 'Empty file URL' });
      continue;
    }
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      continue;
    }

    let filename = fileUrl;
    if (filename.startsWith('/uploads/')) {
      filename = filename.replace('/uploads/', '');
    } else if (filename.startsWith('uploads/')) {
      filename = filename.replace('uploads/', '');
    } else if (filename.startsWith('/')) {
      filename = filename.slice(1);
    }

    const possiblePaths = [
      path.join(uploadDir, path.basename(filename)),
      path.join(publicDir, fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl),
      path.join(rootDir, fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl),
      path.join(uploadDir, filename)
    ];

    let found = false;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        found = true;
        break;
      }
    }

    if (!found) {
      missingAssets.push({
        ...fileRow,
        reason: 'File absent on disk storage'
      });
    }
  }

  return {
    totalChecked: filesRes.rows.length,
    missingCount: missingAssets.length,
    missingAssets
  };
}

