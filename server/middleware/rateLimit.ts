import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

const resolveClientKey = (req: any): string => {
  if (req.user?.id) {
    return `user_${req.user.id}`;
  }
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      return `auth_${token.slice(-20)}`;
    }
  }
  if (req.cookies && req.cookies.token) {
    return `cookie_${req.cookies.token.slice(-20)}`;
  }
  return ipKeyGenerator(req.ip || 'anonymous');
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

// Login/Signup only — keep strict (10 attempts per 15 min)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security: Too many auth attempts. Please try again later.' }
});

// Dedicated limiter for refresh-token endpoint — must NOT share with authLimiter
export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 10,                    // 10 refreshes per minute per user — well above normal need
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many token refresh attempts. Please wait a moment.' }
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please wait a moment.' }
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again in an hour.' }
});

export const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security alert: Too many token verification requests. Slow down.' }
});

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security: Too many admin requests. Action throttled.' }
});

export const broadcastLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many broadcast attempts. Admin communications are limited.' }
});

export const forumLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many post or comment requests. Please wait a minute.' }
});
