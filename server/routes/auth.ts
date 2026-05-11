import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool, ledgerPool } from '../db/index.js';
import { sendSmartEmail } from '../services/email.js';
import { logSystemActivity } from '../services/notifications.js';

const router = express.Router();

const getBaseUrl = (req: express.Request) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  const envUrl = process.env.VITE_APP_URL || process.env.APP_URL;
  let origin = `${protocol}://${host}`;
  if (envUrl && envUrl.startsWith('http')) origin = envUrl;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

const getRedirectUri = (req?: any) => {
  let baseUrl = process.env.APP_URL;
  if (!baseUrl && req) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    baseUrl = `${protocol}://${host}`;
  }
  if (!baseUrl) baseUrl = 'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}/api/auth/google/callback`;
};

router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, language = 'en' } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const lowerEmail = email.toLowerCase();
    const existingUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1::text', [lowerEmail]);
    if (existingUser.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const role = lowerEmail === 'qoomre@gmail.com' ? 'admin' : 'user';

    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, provider, role) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [lowerEmail, name || lowerEmail.split('@')[0], passwordHash, 'email', role]
    );

    const user = result.rows[0];
    await ledgerPool.query(`INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [user.id]);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });

    await logSystemActivity(user.id, 'signup', 'User signed up', {}, req);
    sendSmartEmail(user.id, user.email, 'welcome_email', { userName: user.name || 'User', baseUrl: getBaseUrl(req) }, language as any).catch(console.error);
  } catch (error) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const lowerEmail = email.toLowerCase();
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1::text', [lowerEmail]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    await logSystemActivity(user.id, 'login', 'User logged in', {}, req);
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get("/google/url", (req, res) => {
  const { ref, lang } = req.query;
  const state = `${ref || ''}|${lang || 'ar'}`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: getRedirectUri(req),
    response_type: 'code',
    scope: 'email profile',
    state: state
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

export default router;
