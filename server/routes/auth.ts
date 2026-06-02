import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool, ledgerPool, getSecurityPool } from '../db/index.js';
import { sendSmartEmail } from '../services/email.js';
import { logSystemActivity } from '../services/notifications.js';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimit.js';
import { authenticateToken, addToBlacklistCache } from '../middleware/auth.js';

const router = express.Router();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('[FATAL] JWT_SECRET is not set in authentication routes.');
}

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

const logAvatarProcess = (context: string, googleUser: any, url: any, isValid: boolean, error?: any) => {
  console.log(`[GoogleAvatarDiagnostic] [${context}]`);
  console.log(`  - Timestamp: ${new Date().toISOString()}`);
  console.log(`  - User Email: ${googleUser?.email || 'N/A'}`);
  console.log(`  - User Name: ${googleUser?.name || googleUser?.given_name || 'N/A'}`);
  console.log(`  - Raw Picture URL: ${JSON.stringify(url)}`);
  console.log(`  - Result of Validation: ${isValid}`);
  if (url && typeof url === 'string') {
    try {
      const parsed = new URL(url);
      console.log(`  - Parsed Hostname: ${parsed.hostname}`);
      console.log(`  - Parsed Protocol: ${parsed.protocol}`);
    } catch (e: any) {
      console.log(`  - URL Parsing Failure: ${e.message}`);
    }
  }
  if (error) {
    console.error(`  - Associated Error Details:`, error);
  }
};

const ALLOWED_GOOGLE_PICTURE_HOSTS = [
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
];

const isValidGooglePicture = (url: any): boolean => {
  if (typeof url !== 'string') {
    console.log(`[isValidGooglePicture] Failed: url is not a string (type is ${typeof url})`);
    return false;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      console.log(`[isValidGooglePicture] Failed: protocol is "${parsed.protocol}", expected https:`);
      return false;
    }
    if (!ALLOWED_GOOGLE_PICTURE_HOSTS.includes(parsed.hostname)) {
      console.log(`[isValidGooglePicture] Failed: hostname "${parsed.hostname}" is not an allowed Google hostname`);
      return false;
    }
    return true;
  } catch (err: any) {
    console.log(`[isValidGooglePicture] Failed: url parsing error - ${err.message}`);
    return false;
  }
};

const createUserSession = async (userId: number, token: string, req: express.Request, expiresInDays: number) => {
  try {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (session_token)
       DO UPDATE SET status = 'active', last_active_at = CURRENT_TIMESTAMP, expires_at = EXCLUDED.expires_at`,
      [userId, token, ipAddress, userAgent, expiresAt]
    );
  } catch (err) {
    console.error('[Session Error] Failed to write session to DB:', err);
  }
};

async function generateUniqueReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let code = '';
  let attempts = 0;
  while (!isUnique && attempts < 100) {
    attempts++;
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const check = await pool.query('SELECT id FROM users WHERE referral_code = $1', [code]);
    if (check.rows.length === 0) {
      isUnique = true;
    }
  }
  return code;
}

router.post("/signup", authLimiter, async (req, res) => {
  try {
    const { email, password, name, language = 'ar', theme = 'dark', ref } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password must be strings' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const lowerEmail = email.toLowerCase();
    const existingUser = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1::text', [lowerEmail]);
    if (existingUser.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const role = lowerEmail === (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '').toLowerCase() ? 'admin' : 'user';

    let referredBy: number | null = null;
    if (ref && typeof ref === 'string' && ref.trim().length > 0) {
      const parentUser = await pool.query('SELECT id FROM users WHERE UPPER(referral_code) = $1', [ref.trim().toUpperCase()]);
      if (parentUser.rows.length > 0) {
        referredBy = parentUser.rows[0].id;
      }
    }

    const referralCode = await generateUniqueReferralCode();
    const normalizedName = name || lowerEmail.split('@')[0];
    const generatedAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(normalizedName)}`;

    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, provider, role, referral_code, referred_by, theme, language, avatar) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [lowerEmail, normalizedName, passwordHash, 'email', role, referralCode, referredBy, theme, language, generatedAvatar]
    );

    const user = result.rows[0];
    
    await ledgerPool.query(`INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [user.id]);

    if (referredBy) {
      let bonusPoints = 1000;
      try {
        const econRes = await ledgerPool.query('SELECT referral_bonus_points FROM economy_settings LIMIT 1');
        if (econRes.rows.length > 0) {
          bonusPoints = parseInt(econRes.rows[0].referral_bonus_points) || 1000;
        }
      } catch (econErr) {
        console.error('Failed to query economy settings:', econErr);
      }

      try {
        await ledgerPool.query(
          `INSERT INTO referrals (referrer_id, referred_id, bonus_points, status) VALUES ($1, $2, $3, 'pending') ON CONFLICT (referred_id) DO NOTHING`,
          [referredBy, user.id, bonusPoints]
        );
        await ledgerPool.query(
          `INSERT INTO referral_tree (referrer_id, referred_id, level, status) VALUES ($1, $2, 1, 'active') ON CONFLICT (referred_id) DO NOTHING`,
          [referredBy, user.id]
        );
      } catch (refErr) {
        console.error('Failed to insert referral record on signup:', refErr);
      }
    }

    const remember = req.body.remember === true || req.body.remember === 'true';
    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, type: 'access', jti: crypto.randomUUID() }, jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id, email: user.email, role: user.role, remember, type: 'refresh', jti: crypto.randomUUID() }, jwtSecret, { expiresIn: remember ? '30d' : '1d' });
    
    await createUserSession(user.id, refreshToken, req, remember ? 30 : 1);

    const fullProfile = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.avatar, u.status, u.language, u.theme, u.referral_code,
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

    res.json({ token: accessToken, refreshToken, user: userPayload });

    await logSystemActivity(user.id, 'signup', 'User signed up', {}, req);
    sendSmartEmail(user.id, user.email, 'welcome_email', { userName: user.name || 'User', baseUrl: getBaseUrl(req) }, language as any).catch(console.error);
    
    import('../services/admin.js').then(({ broadcastAdminStats }) => {
      broadcastAdminStats().catch(err => console.error('[Socket] Failed to broadcast admin stats on signup:', err));
    }).catch(err => console.error('[Socket] Failed to load admin service on signup:', err));
  } catch (error) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password must be strings' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

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

    let userAvatar = user.avatar;
    if (!userAvatar) {
      userAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || lowerEmail.split('@')[0])}`;
      await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [userAvatar, user.id]);
    }

    const remember = req.body.remember === true || req.body.remember === 'true';
    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, type: 'access', jti: crypto.randomUUID() }, jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id, email: user.email, role: user.role, remember, type: 'refresh', jti: crypto.randomUUID() }, jwtSecret, { expiresIn: remember ? '30d' : '1d' });
    
    await createUserSession(user.id, refreshToken, req, remember ? 30 : 1);

    const fullProfile = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.avatar, u.status, u.language, u.theme, u.referral_code,
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

    res.json({ token: accessToken, refreshToken, user: userPayload });
    await logSystemActivity(user.id, 'login', 'User logged in', {}, req);
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'RefreshTokenRequired', message: 'Refresh token is required' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, jwtSecret);
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'TokenExpiredError', message: 'Refresh token has expired' });
      }
      return res.status(401).json({ error: 'InvalidToken', message: 'Refresh token verification failed' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'InvalidTokenType', message: 'Invalid token type' });
    }

    const blacklistCheck = await getSecurityPool().query('SELECT id FROM token_blacklist WHERE token = $1', [refreshToken]);
    if (blacklistCheck.rows.length > 0) {
      console.warn(`[Security Alert] Replay attempt with blacklisted refresh token from user ID: ${decoded.id}`);
      await pool.query("UPDATE user_sessions SET status = 'inactive' WHERE user_id = $1", [decoded.id]);
      return res.status(401).json({ error: 'CompromisedSession', message: 'Session has been invalidated due to token reuse' });
    }

    const sessionRes = await pool.query(
      "SELECT id FROM user_sessions WHERE session_token = $1 AND status = 'active' AND expires_at > CURRENT_TIMESTAMP", 
      [refreshToken]
    );
    if (sessionRes.rows.length === 0) {
      return res.status(401).json({ error: 'SessionInactive', message: 'Session is inactive or already processed' });
    }

    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'UserNotFound', message: 'User does not exist' });
    }

    const user = userRes.rows[0];
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Suspended', message: 'User account is suspended' });
    }

    const remember = decoded.remember === true || decoded.remember === 'true';
    const newAccessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, type: 'access', jti: crypto.randomUUID() }, jwtSecret, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ id: user.id, email: user.email, role: user.role, remember, type: 'refresh', jti: crypto.randomUUID() }, jwtSecret, { expiresIn: remember ? '30d' : '1d' });

    await pool.query("UPDATE user_sessions SET status = 'inactive' WHERE session_token = $1", [refreshToken]);

    const expirySec = decoded.exp ? Math.floor(decoded.exp) : Math.floor(Date.now() / 1000) + 3600;
    await getSecurityPool().query(
      "INSERT INTO token_blacklist (token, expires_at) VALUES ($1, TO_TIMESTAMP($2)) ON CONFLICT (token) DO NOTHING",
      [refreshToken, expirySec]
    );

    await createUserSession(user.id, newRefreshToken, req, remember ? 30 : 1);

    res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (error: any) {
    console.error('[Refresh-Token Error]:', error.message);
    res.status(500).json({ error: 'Internal Server Error during token refresh' });
  }
});

router.get("/google/url", async (req, res) => {
  try {
    const { ref, lang, remember, mode, theme } = req.query;
    
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 600000);

    await pool.query(
      `INSERT INTO oauth_states (state, provider, redirect_url, expires_at) VALUES ($1, $2, $3, $4)`,
      [nonce, 'google', JSON.stringify({ 
        ref: ref as string || null, 
        lang: lang as string || 'en', 
        mode: mode as string || 'popup', 
        remember: remember === 'true',
        theme: theme as string || 'dark'
      }), expiresAt]
    );

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: getRedirectUri(req),
      response_type: 'code',
      scope: 'email profile',
      state: nonce
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  } catch (error: any) {
    console.error('[Google-URL Error]:', error?.message || error);
    res.status(500).json({ error: 'Internal Server Error during Google OAuth URL creation' });
  }
});

router.post("/logout", authenticateToken, async (req: any, res) => {
  try {
    const token = req.token;
    if (token) {
      const decoded: any = jwt.verify(token, jwtSecret);
      const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      await getSecurityPool().query(
        'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
        [token, expiresAt]
      );
      addToBlacklistCache(token);
    }

    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        await pool.query(
          "UPDATE user_sessions SET status = 'revoked', last_active_at = CURRENT_TIMESTAMP WHERE session_token = $1",
          [refreshToken]
        );
        try {
          const rfDecoded: any = jwt.verify(refreshToken, jwtSecret);
          const rfExpiry = rfDecoded?.exp ? new Date(rfDecoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await getSecurityPool().query(
            'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
            [refreshToken, rfExpiry]
          );
        } catch {
          await getSecurityPool().query(
            'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING',
            [refreshToken, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
          );
        }
      } catch (sessionErr) {
        console.error('[Session] Failed to revoke session on logout:', sessionErr);
      }
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

    const stateCheck = await pool.query(
      'SELECT * FROM oauth_states WHERE state = $1 AND expires_at > CURRENT_TIMESTAMP',
      [state]
    );

    if (stateCheck.rows.length === 0) {
      return res.status(403).send('Invalid or expired auth session');
    }

    const stateRow = stateCheck.rows[0];
    const storedState = JSON.parse(stateRow.redirect_url);
    await pool.query('DELETE FROM oauth_states WHERE state = $1', [state]);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: getRedirectUri(req),
        grant_type: 'authorization_code'
      } as any).toString(),
      signal: AbortSignal.timeout(8000)
    });

    const tokens = await tokenResponse.json() as any;
    if (tokens.error) {
      console.error('[GoogleAuth] Token Error:', tokens.error);
      return res.status(400).send('Auth failed');
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(8000)
    });
    const googleUser = await userRes.json() as any;

    if (!googleUser.email) return res.status(400).send('No email from Google');

    const lowerEmail = googleUser.email.toLowerCase();
    
    let result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1::text', [lowerEmail]);
    let user;

    if (result.rows.length === 0) {
      const role = lowerEmail === (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || '').toLowerCase() ? 'admin' : 'user';
      const finalLang = storedState.lang || 'en';
      const finalTheme = storedState.theme || 'dark';
      
      let referredBy: number | null = null;
      const ref = storedState?.ref;
      if (ref && typeof ref === 'string' && ref.trim().length > 0) {
        const parentUser = await pool.query('SELECT id FROM users WHERE UPPER(referral_code) = $1', [ref.trim().toUpperCase()]);
        if (parentUser.rows.length > 0) {
          referredBy = parentUser.rows[0].id;
        }
      }

      const referralCode = await generateUniqueReferralCode();

      const isPictureValid = isValidGooglePicture(googleUser.picture);
      logAvatarProcess('Google Signup', googleUser, googleUser.picture, isPictureValid);

      const validatedPicture = isPictureValid 
        ? googleUser.picture 
        : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(googleUser.name || googleUser.given_name || lowerEmail.split('@')[0])}`;
      const insertResult = await pool.query(
        `INSERT INTO users (email, name, avatar, provider, role, language, theme, referral_code, referred_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [lowerEmail, googleUser.name || googleUser.given_name, validatedPicture, 'google', role, finalLang, finalTheme, referralCode, referredBy]
      );
      user = insertResult.rows[0];
      
      await ledgerPool.query(`INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [user.id]);

      if (referredBy) {
        let bonusPoints = 1000;
        try {
          const econRes = await ledgerPool.query('SELECT referral_bonus_points FROM economy_settings LIMIT 1');
          if (econRes.rows.length > 0) {
            bonusPoints = parseInt(econRes.rows[0].referral_bonus_points) || 1000;
          }
        } catch (econErr) {
          console.error('Failed to query economy settings in Google registration:', econErr);
        }

        try {
          await ledgerPool.query(
            `INSERT INTO referrals (referrer_id, referred_id, bonus_points, status) VALUES ($1, $2, $3, 'pending') ON CONFLICT (referred_id) DO NOTHING`,
            [referredBy, user.id, bonusPoints]
          );
          await ledgerPool.query(
            `INSERT INTO referral_tree (referrer_id, referred_id, level, status) VALUES ($1, $2, 1, 'active') ON CONFLICT (referred_id) DO NOTHING`,
            [referredBy, user.id]
          );
        } catch (refErr) {
          console.error('Failed to insert referral record on Google registration:', refErr);
        }
      }

      await logSystemActivity(user.id, 'signup', 'User signed up via Google', {}, req);
    } else {
      user = result.rows[0];
      if (user.status === 'suspended') return res.status(403).send('Account suspended');
      
      const updates = [];
      const values = [];
      if (user.provider !== 'google') {
        updates.push(`provider = $${updates.length + 1}`);
        values.push('google');
      }

      const isPictureValid = isValidGooglePicture(googleUser.picture);
      logAvatarProcess('Google Login Update', googleUser, googleUser.picture, isPictureValid);

      const validatedPicture = isPictureValid ? googleUser.picture : null;
      if (validatedPicture && validatedPicture !== user.avatar) {
        updates.push(`avatar = $${updates.length + 1}`);
        values.push(validatedPicture);
        user.avatar = validatedPicture;
      }

      const googleName = googleUser.name || googleUser.given_name;
      if (googleName && googleName !== user.name) {
        updates.push(`name = $${updates.length + 1}`);
        values.push(googleName);
        user.name = googleName;
      }
      
      if (storedState.lang && storedState.lang !== user.language) {
        updates.push(`language = $${updates.length + 1}`);
        values.push(storedState.lang);
        user.language = storedState.lang; 
      }

      if (storedState.theme && storedState.theme !== user.theme) {
        updates.push(`theme = $${updates.length + 1}`);
        values.push(storedState.theme);
        user.theme = storedState.theme;
      }

      if (updates.length > 0) {
        values.push(user.id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
      }
      
      await logSystemActivity(user.id, 'login', 'User logged in via Google', {}, req);
    }

    const remember = storedState?.remember === true || storedState?.remember === 'true';
    const accessToken = jwt.sign({ id: user.id, email: user.email, role: user.role, type: 'access', jti: crypto.randomUUID() }, jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id, email: user.email, role: user.role, remember, type: 'refresh', jti: crypto.randomUUID() }, jwtSecret, { expiresIn: remember ? '30d' : '1d' });
    
    await createUserSession(user.id, refreshToken, req, remember ? 30 : 1);

    const fullProfile = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.avatar, u.status, u.language, u.theme, u.referral_code,
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
      referral_code: row.referral_code,
      subscription: row.plan_id ? {
        plan_id: row.plan_id,
        status: row.sub_status,
        current_period_end: row.current_period_end,
        plan_name_en: row.plan_name_en,
        plan_name_ar: row.plan_name_ar,
        plan_color: row.plan_color
      } : null
    };

    const lang = storedState.lang || user.language || 'en';
    let targetRef = storedState.ref || '/';
    if (
      typeof targetRef !== 'string' ||
      !targetRef.startsWith('/') ||
      targetRef.startsWith('//') ||
      targetRef.startsWith('\\') ||
      targetRef.toLowerCase().includes('javascript:')
    ) {
      targetRef = '/';
    }
    const allowedOrigin = getBaseUrl(req);
    
    const pagePayload = JSON.stringify({
      token: accessToken,
      refreshToken,
      ...userPayload,
      lang,
      ref: targetRef,
      remember: !!storedState.remember
    });

    const isPopupMode = storedState.mode === 'popup';
    const titleText = lang === 'ar' ? 'جاري التحقق...' : 'Authenticating...';
    const successText = lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Login Successful';
    const secureText = lang === 'ar' ? 'اتصال آمن' : 'SECURE SESSION';
    const closeBtnText = lang === 'ar' ? 'إغلاق ومتابعة' : 'Close and Continue';
    const direction = lang === 'ar' ? 'rtl' : 'ltr';
    const allowedOriginJson = JSON.stringify(allowedOrigin);
    const targetRefJson = JSON.stringify(targetRef);

    res.send(`<!DOCTYPE html>
      <html>
        <head>
          <title>${titleText}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
          <style nonce="${res.locals.nonce}">
            :root {
              --radius-xl: 32px;
              --radius-lg: 20px;
              --radius-md: 12px;
              --radius-sm: 6px;
              --emerald-500: #10b981;
              --bg-dark: #09090b;
              --bg-panel: rgba(17, 17, 19, 0.9);
            }
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes emeraldPulse {
              0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
              70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
              100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
            body {
              background: var(--bg-dark);
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: 'Tajawal', sans-serif;
              overflow: hidden;
              direction: ${direction};
            }
            .auth-card {
              text-align: center;
              padding: clamp(2rem, 8vw, 3.5rem);
              background: var(--bg-panel);
              border: 1px solid rgba(16, 185, 129, 0.25);
              border-radius: var(--radius-xl);
              backdrop-filter: blur(20px);
              box-shadow: 0 30px 60px rgba(0,0,0,0.7);
              max-width: 90%;
              width: 440px;
              animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
              position: relative;
            }
            .spinner-container {
              position: relative;
              width: 90px;
              height: 90px;
              margin: 0 auto clamp(1.5rem, 5vw, 2rem);
            }
            .spinner-bg {
              position: absolute;
              inset: 0;
              border: 5px solid rgba(16, 185, 129, 0.08);
              border-radius: 50%;
            }
            .spinner-active {
              position: absolute;
              inset: 0;
              border: 5px solid transparent;
              border-top-color: var(--emerald-500);
              border-radius: 50%;
              animation: spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
              filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.4));
            }
            .spinner-icon {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              animation: emeraldPulse 2s infinite;
              border-radius: 50%;
            }
            .title {
              color: white;
              margin: 0 0 1rem 0;
              font-size: clamp(1.5rem, 6vw, 1.875rem);
              font-weight: 700;
              letter-spacing: -0.025em;
              text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .description {
              color: #a1a1aa;
              margin: 0 0 clamp(1.5rem, 6vw, 2.5rem) 0;
              font-size: clamp(1rem, 3.5vw, 1.125rem);
              line-height: 1.6;
              font-weight: 400;
            }
            .btn {
              background: #10b981;
              color: white;
              border: none;
              padding: 1rem 2.5rem;
              border-radius: var(--radius-sm);
              font-weight: 700;
              cursor: pointer;
              transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              font-family: inherit;
              font-size: 1.125rem;
              box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.4);
              width: 100%;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .btn:hover {
              transform: translateY(-3px);
              box-shadow: 0 15px 30px -5px rgba(16, 185, 129, 0.6);
              filter: brightness(1.1);
              background: #10b981;
            }
            .btn:active {
              transform: translateY(-1px);
            }
          </style>
        </head>
        <body>
          <div class="auth-card">
            <div class="spinner-container">
              <div class="spinner-bg"></div>
              <div class="spinner-active"></div>
              <div class="spinner-icon">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
            </div>
            <h2 class="title">${successText}</h2>
            <div class="status-badge" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 12px; color: #10b981; font-weight: 700; font-size: 0.75rem; letter-spacing: 0.1em; opacity: 0.8;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span>${secureText}</span>
            </div>
            <button id="closeBtn" class="btn" style="margin-top: 2rem;">${closeBtnText}</button>
          </div>

          <script id="__auth_data__" type="application/json">${pagePayload}</script>
          <script nonce="${res.locals.nonce}">
            (function() {
              const closeBtn = document.getElementById('closeBtn');
              if (closeBtn) closeBtn.onclick = function() { try { window.close(); } catch(e) {} };

              try {
                const data = JSON.parse(document.getElementById('__auth_data__').textContent);
                const allowedOrigin = ${allowedOriginJson};
                const targetRefRaw = ${targetRefJson};
                const safeRef = (typeof targetRefRaw === 'string' && targetRefRaw.startsWith('/') && !targetRefRaw.startsWith('//')) ? targetRefRaw : '/';

                try {
                  localStorage.setItem('app_token', data.token);
                  if (data.refreshToken) localStorage.setItem('app_refresh_token', data.refreshToken);
                  localStorage.setItem('app_oauth_user', JSON.stringify(data));
                  localStorage.setItem('language', data.lang);
                  if (data.remember) localStorage.setItem('app_remember', 'true');
                  localStorage.setItem('app_oauth_trigger', Date.now().toString());
                } catch (e) {}

                let isPopup = ${isPopupMode};
                try {
                  if (!isPopup) isPopup = !!(window.opener && window.opener !== window);
                } catch (e) {}

                if (isPopup) {
                  try {
                    window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: data }, allowedOrigin);
                  } catch (e) {}
                }

                try {
                  const authChannel = new BroadcastChannel('app_oauth_channel');
                  authChannel.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: data });
                } catch (e) {}

                setTimeout(function() {
                  if (isPopup) {
                    window.close();
                  } else {
                    window.location.href = window.location.origin + safeRef;
                  }
                }, 150);
              } catch (err) {
                console.error('Auth processing failed', err);
                window.location.href = '/';
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

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    const recentReset = await pool.query(
      "SELECT id FROM password_resets WHERE email = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '2 minutes'",
      [email]
    );
    if (recentReset.rows.length > 0) {
      return res.status(429).json({ 
        error: 'Too many requests for this email. Please wait 2 minutes before trying again.',
        error_ar: 'طلبات كثيرة لهذا البريد. يرجى الانتظار دقيقتين قبل المحاولة مرة أخرى.'
      });
    }

    const userCheck = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.json({ success: true, message: 'If an account exists, a reset link will be sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000);

    await pool.query('DELETE FROM password_resets WHERE email = $1', [email]);

    await pool.query(
      'INSERT INTO password_resets (email, token, expires_at) VALUES ($1, $2, $3)',
      [email, token, expires]
    );

    const resetLink = `${getBaseUrl(req)}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    
    await sendSmartEmail(userCheck.rows[0].id, email, 'password_reset', {
      userName: userCheck.rows[0].name,
      actionUrl: resetLink
    });

    res.json({ success: true, message: 'Reset link sent successfully.' });
  } catch (error) {
    console.error('[Auth] Forgot Password Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post("/reset-password", authLimiter, async (req, res) => {
  const client = await pool.connect();
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Missing token or password' });
    if (typeof token !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Token and password must be strings' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    await client.query('BEGIN');

    const resetCheck = await client.query(
      'SELECT email FROM password_resets WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP',
      [token]
    );

    if (resetCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const email = resetCheck.rows[0].email;
    const hashedPassword = await bcrypt.hash(password, 10);

    await client.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [hashedPassword, email]
    );

    await client.query('DELETE FROM password_resets WHERE token = $1', [token]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Auth] Reset Password Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;
