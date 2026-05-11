import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { pool, ledgerPool } from '../db/index.js';
import { sendSmartEmail } from '../services/email.js';
import { logSystemActivity } from '../services/notifications.js';

const router = express.Router();

const oauthStateStore = new Map<string, { ref: string; lang: string; expires: number }>();

const getBaseUrl = (req: express.Request) => {
  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('x-forwarded-host') || req.get('host');
  const envUrl = process.env.VITE_APP_URL || process.env.APP_URL;
  if (envUrl && envUrl.startsWith('http') && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  const origin = `${protocol}://${host}`;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

const getRedirectUri = (req: express.Request) => {
  return `${getBaseUrl(req)}/api/auth/google/callback`;
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
  const nonce = crypto.randomBytes(16).toString('hex');
  oauthStateStore.set(nonce, {
    ref: (ref as string) || '',
    lang: (lang as string) || 'ar',
    expires: Date.now() + 10 * 60 * 1000
  });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: getRedirectUri(req),
    response_type: 'code',
    scope: 'email profile',
    state: nonce
  });
  res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('No code provided');

    const stateData = oauthStateStore.get(state as string);
    if (!stateData || Date.now() > stateData.expires) {
      oauthStateStore.delete(state as string);
      return res.status(400).send('Invalid or expired state');
    }
    oauthStateStore.delete(state as string);

    const { ref, lang } = stateData;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: getRedirectUri(req),
        grant_type: 'authorization_code'
      } as any).toString()
    });

    const tokens = await tokenResponse.json() as any;
    if (tokens.error) {
      console.error('[GoogleAuth] Token Error:', tokens.error);
      return res.status(400).send('Auth failed');
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const googleUser = await userRes.json() as any;

    if (!googleUser.email) return res.status(400).send('No email from Google');

    const lowerEmail = googleUser.email.toLowerCase();

    let result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1::text', [lowerEmail]);
    let user;

    if (result.rows.length === 0) {
      const role = lowerEmail === 'qoomre@gmail.com' ? 'admin' : 'user';
      const insertResult = await pool.query(
        `INSERT INTO users (email, name, avatar, provider, role) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [lowerEmail, googleUser.name || googleUser.given_name, googleUser.picture, 'google', role]
      );
      user = insertResult.rows[0];
      await ledgerPool.query(`INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [user.id]);
      await logSystemActivity(user.id, 'signup', 'User signed up via Google', {}, req);
    } else {
      user = result.rows[0];
      if (user.status === 'suspended') return res.status(403).send('Account suspended');
      if (user.provider !== 'google') {
        await pool.query('UPDATE users SET provider = $1, avatar = $2 WHERE id = $3', ['google', googleUser.picture, user.id]);
      }
      await logSystemActivity(user.id, 'login', 'User logged in via Google', {}, req);
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    const redirectBase = getBaseUrl(req).replace(/\/+$/, '');

    const authPayload = JSON.stringify({
      token,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      lang
    });

    const safePayload = authPayload
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/<\/script>/gi, '<\\/script>');

    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>Authenticating...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="background:#0f0f11;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:'Tajawal',sans-serif;">
  <div style="text-align:center;padding:20px;">
    <div style="width:50px;height:50px;border:3px solid #10b981;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px;"></div>
    <h2 style="color:#10b981;margin:0 0 10px 0;">Authentication Successful</h2>
    <p style="color:#9ca3af;margin:0;">Finalizing your secure session...</p>
  </div>
  <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  <script>
    (function() {
      try {
        const data = JSON.parse(\`${safePayload}\`);
        const allowedOrigin = ${JSON.stringify(redirectBase)};

        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: data }, allowedOrigin);
          } catch (e) {}
        }

        try {
          const channel = new BroadcastChannel('app_oauth_channel');
          channel.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: data });
        } catch (e) {}

        try {
          localStorage.setItem('app_token', data.token);
          localStorage.setItem('app_oauth_user', JSON.stringify(data));
          localStorage.setItem('app_oauth_trigger', Date.now().toString());
        } catch (e) {}

        setTimeout(() => {
          if (window.opener && !window.opener.closed) {
            window.close();
          } else {
            window.location.href = allowedOrigin + '/';
          }
        }, 800);
      } catch (err) {
        window.location.href = ${JSON.stringify(redirectBase + '/')};
      }
    })();
  </script>
</body>
</html>`);
  } catch (error) {
    console.error('[GoogleAuth] Callback Error:', error);
    res.status(500).send('Authentication processing failed');
  }
});

export default router;
