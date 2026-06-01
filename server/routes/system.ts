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
