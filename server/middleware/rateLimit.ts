import { rateLimit } from 'express-rate-limit';

// express-rate-limit automatically uses req.ip as the default key.
// Since 'trust proxy' is configured on Express (app.set('trust proxy', 1)),
// req.ip is proxy-aware, fully secure, and natively handles both IPv4 and IPv6 normalization.

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // High-performance threshold for standard activities
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security: Too many auth attempts. Please try again later.' }
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please wait a moment.' }
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again in an hour.' }
});

export const tokenLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // max 120 validations per minute per IP to protect verification endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security alert: Too many token verification requests. Slow down.' }
});

export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 administrative interactions to block brute-forcing and scraping
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Security: Too many admin requests. Action throttled.' }
});

