import express from 'express';
import { pool } from '../db/index.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { getAppName } from '../services/system.js';

const router = express.Router();

router.get("/settings", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        site_name_en, site_name_ar, site_description_en, site_description_ar,
        seo_description_en, seo_description_ar, keywords_en, keywords_ar,
        google_analytics_id, logo_url, favicon_url
      FROM system_settings LIMIT 1
    `);
    res.json(result.rows[0] || {});
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/economy", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
        welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, conversion_rate
      FROM system_settings LIMIT 1
    `);
    res.json(result.rows[0] || {
      points_per_dollar: 100,
      min_payout_usd: 10,
      min_deposit_usd: 5,
      referral_bonus_percent: 10,
      welcome_bonus_points: 600,
      referral_bonus_points: 1000,
      min_withdrawal_cents: 2000,
      conversion_rate: 0.001
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const { 
      site_name_en, site_name_ar, site_description_en, site_description_ar,
      seo_description_en, seo_description_ar, keywords_en, keywords_ar,
      google_analytics_id, logo_url, favicon_url
    } = req.body;
    
    await pool.query(`
      UPDATE system_settings SET 
        site_name_en = $1, site_name_ar = $2, site_description_en = $3, site_description_ar = $4,
        seo_description_en = $5, seo_description_ar = $6, keywords_en = $7, keywords_ar = $8,
        google_analytics_id = $9, logo_url = $10, favicon_url = $11, updated_at = CURRENT_TIMESTAMP
    `, [
      site_name_en, site_name_ar, site_description_en, site_description_ar,
      seo_description_en, seo_description_ar, keywords_en, keywords_ar,
      google_analytics_id, logo_url, favicon_url
    ]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/admin/economy", authenticateAdmin, async (req, res) => {
  try {
    const { 
      points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
      welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, conversion_rate
    } = req.body;
    
    await pool.query(`
      UPDATE system_settings SET 
        points_per_dollar = $1, min_payout_usd = $2, min_deposit_usd = $3, 
        referral_bonus_percent = $4, welcome_bonus_points = $5, 
        referral_bonus_points = $6, min_withdrawal_cents = $7, 
        conversion_rate = $8, updated_at = CURRENT_TIMESTAMP
    `, [
      points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent,
      welcome_bonus_points, referral_bonus_points, min_withdrawal_cents, conversion_rate
    ]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

export default router;
