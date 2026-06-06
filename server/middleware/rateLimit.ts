import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

// Global key generator to resolve clients by Bearer Token if present, or fall back to IP.
// This prevents cross-user rate limit starvation in shared proxy environments.
const resolveClientKey = (req: any): string => {
  if (req.user?.id) {
    return `user_${req.user.id}`;
  }
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      // Use the last 20 characters of the token as a highly unique key safely
      return `auth_${token.slice(-20)}`;
    }
  }
  // Try checking query token or session cookies as secondary identifiers
  if (req.cookies && req.cookies.token) {
    return `cookie_${req.cookies.token.slice(-20)}`;
  }
  return ipKeyGenerator(req.ip || 'anonymous');
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000, // Elevated to 3000 to prevent false positive lockouts under concurrent loading
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200, // Boosted to handle high-volume sign-ins/re-auth actions safely
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security: Too many auth attempts. Please try again later.' }
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // Elevated to provide smooth uninterrupted conversational usage
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please wait a moment.' }
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again in an hour.' }
});

export const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000, // Considerably boosted to easily handle heavy parallel page loads and component retries
  keyGenerator: resolveClientKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security alert: Too many token verification requests. Slow down.' }
});

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
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

