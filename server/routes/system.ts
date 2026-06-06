import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateAdmin, authenticateToken } from '../middleware/auth.js';
import { getSystemSettings, updateSystemSettings, getEconomySettings, updateEconomySettings } from '../services/system.js';
import { pool } from '../db/index.js';
import { getStripe, getPayPalCredentials } from '../services/payments.js';

const router = express.Router();

const checkOptionalAuth = (req: express.Request): boolean => {
  try {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    if (token) {
      token = token.trim();
      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }
    }
    if (!token || token === 'null' || token === 'undefined' || token === '') {
      return false;
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return false;
    jwt.verify(token, jwtSecret);
    return true;
  } catch {
    return false;
  }
};

router.get("/settings", async (req, res) => {
  try {
    const settings = { ...await getSystemSettings() };

    // Dynamically check activation based on configuration/cred availability
    const stripeObj = await getStripe().catch(() => null);
    const paypalObj = await getPayPalCredentials().catch(() => null);

    const isStripeActive = !!stripeObj;
    const isPaypalActive = !!paypalObj;

    const isAuth = checkOptionalAuth(req);
    if (!isAuth) {
      delete settings.stripe_publishable_key;
      delete settings.paypal_client_id;
    }
    res.json({
      ...settings,
      stripe_active: isStripeActive,
      paypal_active: isPaypalActive
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.get("/economy", async (req, res) => {
  try {
    const economy = { ...await getEconomySettings() };
    const isAuth = checkOptionalAuth(req);
    if (!isAuth) {
      delete economy.crypto_address;
      delete economy.bank_name;
      delete economy.bank_recipient;
      delete economy.bank_iban;
      delete economy.bank_swift;
      delete economy.paypal_email;
    }
    res.json(economy);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

// Dynamic SEO Link Metadata Scraper & Router with Cache
const urlMetadataCache = new Map<string, any>();

router.get("/link-metadata", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let cleanUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }

  if (urlMetadataCache.has(cleanUrl)) {
    return res.json(urlMetadataCache.get(cleanUrl));
  }

  try {
    const parsedUrl = new URL(cleanUrl);
    const domain = parsedUrl.hostname;
    const defaultMeta = {
      title: domain,
      description: '',
      image: '',
      site_name: domain.replace(/^www\./i, '').split('.')[0] || domain,
      url: cleanUrl,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const fetchRes = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });

    clearTimeout(timeoutId);

    if (!fetchRes.ok) {
      urlMetadataCache.set(cleanUrl, defaultMeta);
      return res.json(defaultMeta);
    }

    const html = await fetchRes.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : defaultMeta.title;

    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : title;

    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const description = descMatch ? descMatch[1].trim() : '';

    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    const ogDescription = ogDescMatch ? ogDescMatch[1].trim() : description;

    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    let image = ogImageMatch ? ogImageMatch[1].trim() : '';
    if (image && !/^https?:\/\//i.test(image)) {
      image = new URL(image, cleanUrl).toString();
    }

    const siteNameMatch = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
    const site_name = siteNameMatch ? siteNameMatch[1].trim() : defaultMeta.site_name;

    const resultMeta = {
      title: ogTitle || title || defaultMeta.title,
      description: ogDescription || defaultMeta.description,
      image: image || defaultMeta.image,
      site_name: site_name || defaultMeta.site_name,
      url: cleanUrl,
      favicon: defaultMeta.favicon
    };

    urlMetadataCache.set(cleanUrl, resultMeta);
    return res.json(resultMeta);
  } catch (err) {
    try {
      const parsedUrl = new URL(cleanUrl);
      const domain = parsedUrl.hostname;
      const fallbackMeta = {
        title: domain,
        description: '',
        image: '',
        site_name: domain.replace(/^www\./i, '').split('.')[0] || domain,
        url: cleanUrl,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
      };
      urlMetadataCache.set(cleanUrl, fallbackMeta);
      return res.json(fallbackMeta);
    } catch {
      const fallbackMeta = {
        title: targetUrl,
        description: '',
        image: '',
        site_name: targetUrl,
        url: cleanUrl,
        favicon: `https://www.google.com/s2/favicons?domain=google.com&sz=64`
      };
      return res.json(fallbackMeta);
    }
  }
});

// User Shortcuts Endpoints
router.post("/shortcuts", authenticateToken, async (req: any, res) => {
  try {
    const { title, query } = req.body;
    const userId = req.user.id;

    if (!title || !query) {
      return res.status(400).json({ error: 'Title and query are required' });
    }

    if (!pool) throw new Error('Database initializing');

    const result = await pool.query(
      'INSERT INTO user_shortcuts (user_id, title, query) VALUES ($1, $2, $3) RETURNING *',
      [userId, title, query]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save shortcut' });
  }
});

router.get("/shortcuts", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    if (!pool) throw new Error('Database initializing');

    const result = await pool.query(
      'SELECT * FROM user_shortcuts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch shortcuts' });
  }
});

// Message Report Endpoint
router.post("/reports", authenticateToken, async (req: any, res) => {
  try {
    const { messageId, reason } = req.body;
    const userId = req.user.id;

    if (!messageId || !reason) {
      return res.status(400).json({ error: 'MessageId and reason are required' });
    }

    if (!pool) throw new Error('Database initializing');

    const result = await pool.query(
      'INSERT INTO message_reports (user_id, message_id, reason) VALUES ($1, $2, $3) RETURNING *',
      [userId, messageId, reason]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to report message' });
  }
});

router.get("/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const settings = await getSystemSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Internal Error' });
  }
});

router.post("/admin/settings", authenticateAdmin, async (req, res) => {
  try {
    const result = await updateSystemSettings(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('[SystemSettings] Failed to update system settings:', error);
    res.status(500).json({ error: error.message || 'Internal Error' });
  }
});

export default router;
