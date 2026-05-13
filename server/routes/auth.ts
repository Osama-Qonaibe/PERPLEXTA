import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { pool, ledgerPool } from '../db/index.js';
import { sendSmartEmail } from '../services/email.js';
import { logSystemActivity } from '../services/notifications.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('[FATAL] JWT_SECRET is not set in authentication routes.');
}

const oauthStateStore = new Map<string, { ref: string | null, lang: string | null, mode?: string, remember?: boolean, expires: number }>();

setInterval(() => {
  const now = Date.now();
  oauthStateStore.forEach((v, k) => {
    if (v.expires < now) oauthStateStore.delete(k);
  });
}, 60000);

const getBaseUrl = (req: express.Request) => {
  const xProto = req.get('x-forwarded-proto');
  const xHost = req.get('x-forwarded-host');
  const host = req.get('host');
  
  const protocol = xProto || req.protocol;
  const finalHost = xHost || host;
  
  const envUrl = process.env.VITE_APP_URL || process.env.APP_URL;
  
  if (envUrl && envUrl.startsWith('http') && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  
  let finalProto = protocol;
  if (finalHost && !finalHost.includes('localhost') && !finalHost.includes('127.0.0.1') && !finalHost.includes('0.0.0.0')) {
    finalProto = 'https';
  }
  
  let origin = `${finalProto}://${finalHost}`;
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
};

const getRedirectUri = (req: express.Request) => {
  return `${getBaseUrl(req)}/api/auth/google/callback`;
};

router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { email, password, name, language = 'en' } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const lowerEmail = email.toLowerCase();
    const existingUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1::text', [lowerEmail]);
    if (existingUser.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const role = lowerEmail === (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '').toLowerCase() ? 'admin' : 'user';

    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, provider, role) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [lowerEmail, name || lowerEmail.split('@')[0], passwordHash, 'email', role]
    );

    const user = result.rows[0];
    
    await ledgerPool.query(`INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [user.id]);
    await pool.query(`
      INSERT INTO subscriptions (user_id, plan_id, status, current_period_end) 
      VALUES ($1, (SELECT id FROM plans WHERE name_en = 'Starter' LIMIT 1), 'active', CURRENT_TIMESTAMP + INTERVAL '100 years')
      ON CONFLICT (user_id) DO NOTHING
    `, [user.id]);

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '7d' });
    
    const fullProfile = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.avatar, u.status,
             s.plan_id, s.status as sub_status, s.current_period_end, p.name_en as plan_name_en, p.name_ar as plan_name_ar, p.color as plan_color
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE u.id = $1
    `, [user.id]);

    const profileRow = fullProfile.rows[0];
    const userPayload = {
      ...profileRow,
      subscription: profileRow.plan_id ? {
        plan_id: profileRow.plan_id,
        status: profileRow.sub_status,
        current_period_end: profileRow.current_period_end,
        plan_name_en: profileRow.plan_name_en,
        plan_name_ar: profileRow.plan_name_ar,
        plan_color: profileRow.plan_color
      } : null
    };

    res.json({ token, user: userPayload });

    await logSystemActivity(user.id, 'signup', 'User signed up', {}, req);
    sendSmartEmail(user.id, user.email, 'welcome_email', { userName: user.name || 'User', baseUrl: getBaseUrl(req) }, language as any).catch(console.error);
  } catch (error) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const lowerEmail = email.toLowerCase();
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1::text', [lowerEmail]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });

    if (!user.password_hash) {
      if (user.provider === 'google') {
        return res.status(401).json({ error: 'Please login using Google' });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '7d' });
    
    const fullProfile = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.avatar, u.status, u.language, u.theme,
             s.plan_id, s.status as sub_status, s.current_period_end, p.name_en as plan_name_en, p.name_ar as plan_name_ar, p.color as plan_color
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE u.id = $1
    `, [user.id]);

    const profileRow = fullProfile.rows[0];
    const userPayload = {
      ...profileRow,
      subscription: profileRow.plan_id ? {
        plan_id: profileRow.plan_id,
        status: profileRow.sub_status,
        current_period_end: profileRow.current_period_end,
        plan_name_en: profileRow.plan_name_en,
        plan_name_ar: profileRow.plan_name_ar,
        plan_color: profileRow.plan_color
      } : null
    };

    res.json({ token, user: userPayload });
    await logSystemActivity(user.id, 'login', 'User logged in', {}, req);
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get("/google/url", (req, res) => {
  const { ref, lang, remember, mode } = req.query;
  
  if (oauthStateStore.size > 1000) {
    const oldestKey = oauthStateStore.keys().next().value;
    if (oldestKey) oauthStateStore.delete(oldestKey);
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  oauthStateStore.set(nonce, { 
    ref: ref as string || null, 
    lang: lang as string || 'ar', 
    mode: mode as string || 'popup',
    remember: remember === 'true',
    expires: Date.now() + 600000 
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

router.post("/logout", authenticateToken, async (req: any, res) => {
  try {
    const token = req.token;
    if (token) {
      const decoded: any = jwt.decode(token);
      const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      await pool.query(
        'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
        [token, expiresAt]
      );
    }
    
    await logSystemActivity(req.user.id, 'logout', 'User logged out', {}, req);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Auth] Logout failed:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('No code provided');

    const storedState = oauthStateStore.get(state as string);
    if (!storedState || storedState.expires < Date.now()) {
      return res.status(403).send('Invalid or expired auth session');
    }
    oauthStateStore.delete(state as string);

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
      const role = lowerEmail === (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '').toLowerCase() ? 'admin' : 'user';
      const finalLang = storedState.lang || 'ar';
      
      const insertResult = await pool.query(
        `INSERT INTO users (email, name, avatar, provider, role, language) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [lowerEmail, googleUser.name || googleUser.given_name, googleUser.picture, 'google', role, finalLang]
      );
      user = insertResult.rows[0];
      
      await ledgerPool.query(`INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [user.id]);
      await pool.query(`
        INSERT INTO subscriptions (user_id, plan_id, status, current_period_end) 
        VALUES ($1, (SELECT id FROM plans WHERE name_en = 'Starter' LIMIT 1), 'active', CURRENT_TIMESTAMP + INTERVAL '100 years')
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id]);

      await logSystemActivity(user.id, 'signup', 'User signed up via Google', {}, req);
    } else {
      user = result.rows[0];
      if (user.status === 'suspended') return res.status(403).send('Account suspended');
      
      const updates = [];
      const values = [];
      if (user.provider !== 'google') {
        updates.push(`provider = $${updates.length + 1}, avatar = $${updates.length + 2}`);
        values.push('google', googleUser.picture);
      }
      
      if (storedState.lang && storedState.lang !== user.language) {
        updates.push(`language = $${updates.length + 1}`);
        values.push(storedState.lang);
        user.language = storedState.lang; 
      }

      if (updates.length > 0) {
        values.push(user.id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
      }
      
      await logSystemActivity(user.id, 'login', 'User logged in via Google', {}, req);
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '7d' });
    
    const fullProfile = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.avatar, u.status, u.language, u.theme,
             s.plan_id, s.status as sub_status, s.current_period_end, p.name_en as plan_name_en, p.name_ar as plan_name_ar, p.color as plan_color
      FROM users u
      LEFT JOIN subscriptions s ON u.id = s.user_id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE u.id = $1
    `, [user.id]);

    const row = fullProfile.rows[0];
    const userPayload = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      avatar: row.avatar,
      status: row.status,
      language: row.language,
      theme: row.theme,
      subscription: row.plan_id ? {
        plan_id: row.plan_id,
        status: row.sub_status,
        current_period_end: row.current_period_end,
        plan_name_en: row.plan_name_en,
        plan_name_ar: row.plan_name_ar,
        plan_color: row.plan_color
      } : null
    };

    const lang = storedState.lang || user.language || 'ar';
    const targetRef = storedState.ref || '/';
    const allowedOrigin = getBaseUrl(req);
    
    const rawPayload = JSON.stringify({ 
      token, 
      ...userPayload,
      lang: lang,
      ref: targetRef,
      remember: !!storedState.remember
    });

    const safePayload = rawPayload
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/\//g, '\\u002f')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    
    res.send(`
      <html>
        <head>
          <title>${lang === 'ar' ? 'جاري التحقق...' : 'Authenticating...'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
        </head>
        <body style="background: #0f0f11; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: 'Tajawal', sans-serif; overflow: hidden;">
          <div style="text-align: center; padding: 40px; background: rgba(26, 26, 28, 0.8); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 24px; backdrop-filter: blur(10px); box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-width: 90%; width: 400px; animation: fadeIn 0.5s ease-out;">
            <div style="position: relative; width: 80px; height: 80px; margin: 0 auto 24px;">
              <div style="position: absolute; inset: 0; border: 4px solid rgba(16, 185, 129, 0.1); border-radius: 50%;"></div>
              <div style="position: absolute; inset: 0; border: 4px solid transparent; border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </div>
            <h2 style="color: white; margin: 0 0 12px 0; font-size: 24px; font-weight: 700;">
              ${lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login Successful'}
            </h2>
            <p style="color: #9ca3af; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
              ${lang === 'ar' ? 'تمت مزامنة بياناتك بأمان. يمكنك الآن إغلاق هذه النافذة والعودة للمنصة.' : 'Session secured. You can now close this window and return to the platform.'}
            </p>
            <button id="closeBtn" style="background: #10b981; color: white; border: none; padding: 12px 32px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.3s; font-family: inherit; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              ${lang === 'ar' ? 'إغلاق ومتابعة' : 'Close and Continue'}
            </button>
          </div>
          
          <style>
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            body { direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; }
          </style>

          <script>
            (function() {
              const closeBtn = document.getElementById('closeBtn');
              const closeAction = () => {
                try {
                   window.close();
                } catch (e) {
                   
                }
              };
              
              if (closeBtn) closeBtn.onclick = closeAction;

              try {
                const data = JSON.parse('${safePayload}');
                const allowedOrigin = ${JSON.stringify(allowedOrigin)};
                const targetRefRaw = ${JSON.stringify(targetRef)};
                const targetRef = (targetRefRaw.startsWith('/') && !targetRefRaw.startsWith('//')) ? targetRefRaw : '/';
                
                try {
                  localStorage.setItem('app_token', data.token);
                  localStorage.setItem('app_oauth_user', JSON.stringify(data));
                  localStorage.setItem('language', data.lang);
                  if (data.remember) {
                    localStorage.setItem('app_remember', 'true');
                  }
                  localStorage.setItem('app_oauth_trigger', Date.now().toString());
                } catch (e) {}

                let isPopup = ${storedState.mode === 'popup' ? 'true' : 'false'};
                try {
                  if (!isPopup) {
                    isPopup = !!(window.opener && window.opener !== window);
                  }
                } catch (e) {}

                if (isPopup) {
                   try {
                     window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: data }, allowedOrigin);
                   } catch (e) {
                     try { window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: data }, '*'); } catch (err) {}
                   }
                }
                
                try {
                  const authChannel = new BroadcastChannel('app_oauth_channel');
                  authChannel.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: data });
                } catch (e) {}

                setTimeout(() => {
                  if (isPopup) {
                    window.close();
                  } else {
                    const currentOrigin = window.location.origin;
                    window.location.href = currentOrigin + (targetRef.startsWith('/') ? '' : '/') + targetRef;
                  }
                }, 1500);
              } catch (err) {
                console.error('Auth processing failed', err);
                window.location.href = "/";
              }
            })();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('[GoogleAuth] Callback Error:', error);
    res.status(500).send('Authentication processing failed');
  }
});

export default router;
