import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { globalLimiter, adminLimiter, authLimiter } from './middleware/rateLimit.js';
import { csrfProtection } from './middleware/csrf.js';

const app = express();

// Explicitly trust proxy headers (including X-Forwarded-For and X-Forwarded-Proto) to handle load balancers / reverse proxies correctly
const trustProxyVal = process.env.TRUST_PROXIES || '1';
if (trustProxyVal === 'true' || trustProxyVal === '1') {
  app.set('trust proxy', 1);
} else {
  app.set('trust proxy', isNaN(Number(trustProxyVal)) ? trustProxyVal.split(',').map(s => s.trim()) : Number(trustProxyVal));
}

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://www.googletagmanager.com",
        "https://*.stripe.com",
        "https://*.googleapis.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "https://*.stripe.com", "https://*.googleapis.com", "https://*.googleusercontent.com", "https://lh3.googleusercontent.com", "https://profiles.google.com", "https://api.dicebear.com"],
      connectSrc: ["'self'", "wss:", "ws:", "https://*.googleapis.com", "https://api.stripe.com", "https://checkout.stripe.com", "https://maps.googleapis.com", "https://*.google-analytics.com", "https://analytics.google.com", "https://www.google.com", "https://*.google.com", "https://*.googletagmanager.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameAncestors: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false
}));

const envOrigins = process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [];
const allowedOrigins = [
  process.env.APP_URL,
  ...envOrigins
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV !== 'production' || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy: Origin not permitted. Configure CORS_ALLOWED_ORIGINS in .env if needed.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json({ 
  limit: '10mb',
  verify: (req: any, res, buf) => {
    if (req.originalUrl && (req.originalUrl.startsWith('/api/payments/webhook') || req.originalUrl.includes('webhook'))) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.path.startsWith('/api/')) {
    console.log(`[API Request] ${req.method} ${req.path}`);
  }
  next();
});

const publicPath = path.join(process.cwd(), 'public');
const uploadsPath = path.join(process.cwd(), 'uploads');
const distPath = path.join(process.cwd(), 'dist');

const serveStaticResource = (fileName: string, fallbackFileName?: string) => {
  return (req: express.Request, res: express.Response) => {
    const distFile = path.join(distPath, fileName);
    const publicFile = path.join(publicPath, fileName);
    
    if (fs.existsSync(distFile)) {
      return res.sendFile(distFile);
    } else if (fs.existsSync(publicFile)) {
      return res.sendFile(publicFile);
    }
    
    if (fallbackFileName) {
      const distFallback = path.join(distPath, fallbackFileName);
      const publicFallback = path.join(publicPath, fallbackFileName);
      if (fs.existsSync(distFallback)) {
        return res.sendFile(distFallback);
      } else if (fs.existsSync(publicFallback)) {
        return res.sendFile(publicFallback);
      }
    }
    
    res.status(404).type('text/plain').send('Not Found');
  };
};

app.get('/manifest.json', serveStaticResource('manifest.json', 'manifest.webmanifest'));
app.get('/manifest.webmanifest', serveStaticResource('manifest.webmanifest', 'manifest.json'));
app.get('/sw.js', serveStaticResource('sw.js'));
app.get('/registerSW.js', serveStaticResource('registerSW.js'));

app.use(express.static(publicPath));

import jwt from 'jsonwebtoken';
import { pool, ledgerPool } from './db/index.js';
import { getSystemSettings } from './services/system.js';

app.get('/uploads/:filename', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsPath, filename);

    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(uploadsPath))) {
      return res.status(403).json({ error: 'Access denied: Path traversal attempt blocked.' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = path.extname(filename).toLowerCase();
    const publicExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

    if (publicExtensions.includes(ext)) {
      return res.sendFile(resolvedPath);
    }

    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];

    if (token) {
      token = token.trim();
      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }
    }

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ error: 'Unauthorized: Authentication is required to download this document.' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('[FATAL] JWT_SECRET is not configured for document server authentication.');
      return res.status(500).json({ error: 'Server misconfiguration: Secure verification key not configured.' });
    }
    jwt.verify(token, jwtSecret, async (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden: Invalid token' });
      }

      const user = decoded as any;
      if (user.role === 'admin') {
        return res.sendFile(resolvedPath);
      }

      try {
        const filePromise = pool.query('SELECT id FROM user_files WHERE user_id = $1 AND file_url = $2', [user.id, filename]);
        const proofPromise = (ledgerPool || pool).query('SELECT id FROM deposit_requests WHERE user_id = $1 AND proof_url LIKE $2', [user.id, `%${filename}%`]);
        
        const [isUserFileRes, isProofRes] = await Promise.all([filePromise, proofPromise]);
        
        if (isUserFileRes.rows.length > 0 || isProofRes.rows.length > 0) {
          return res.sendFile(resolvedPath);
        }

        return res.status(403).json({ error: 'Unauthorized: Access to this private document is denied.' });
      } catch (dbErr) {
        console.error('[Upload Secure Handler] Database error:', dbErr);
        return res.status(500).json({ error: 'Database verification failure' });
      }
    });

  } catch (error) {
    next(error);
  }
});

app.use('/api', globalLimiter);
app.use('/api', csrfProtection);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import messageRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import fileRoutes from './routes/files.js';
import paymentRoutes from './routes/payments.js';
import toolRoutes from './routes/tools.js';
import userRoutes from './routes/users.js';
import systemRoutes from './routes/system.js';
import walletRoutes from './routes/wallet.js';
import planRoutes from './routes/plans.js';
import notificationRoutes from './routes/notifications.js';
import subscriptionRoutes from './routes/subscriptions.js';
import memoryRoutes from './routes/memory.js';
import kycRoutes from './routes/kyc.js';
import emailRoutes from './routes/email.js';
import forumRoutes from './routes/forum.js';
import blogRoutes from './routes/blog.js';
import marketplaceRoutes from './routes/marketplace.js';

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/mail-services-v3', emailRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/system', systemRoutes);
app.use('/api', systemRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api', toolRoutes);

function injectSEOTags(html: string, settings: any, req: express.Request): string {
  if (!settings) return html;

  const acceptLang = req.headers['accept-language'] || '';
  const isEn = acceptLang.toLowerCase().startsWith('en');
  const isAr = !isEn; // Arabic is the default!

  const nameAr = settings.site_name_ar || 'بيربليكستا';
  const nameEn = settings.site_name_en || 'Perplexta';
  const seoAr = settings.seo_description_ar || settings.site_description_ar || 'منصة التحليلات المتقدمة والذكاء الاصطناعي';
  const seoEn = settings.seo_description_en || settings.site_description_en || 'Professional elite AI and advanced analytics platform';
  const keywordsAr = settings.keywords_ar || 'ذكاء اصطناعي, تحليل تقني, تداول, برمجة';
  const keywordsEn = settings.keywords_en || 'AI, technical analysis, trading, coding';

  const currentTitle = isAr ? nameAr : nameEn;
  const currentDesc = isAr ? seoAr : seoEn;
  const currentKeywords = isAr ? keywordsAr : keywordsEn;

  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = req.headers.host || 'perplexta.com';
  const baseUrl = `${protocol}://${host}`;

  let imageUrl = settings.seo_image_url || '/app-assets/og-image.png';
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
    const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    imageUrl = `${baseUrl}${cleanPath}`;
  }

  let faviconUrl = settings.favicon_url || '/app-assets/icon.png';
  if (faviconUrl && !faviconUrl.startsWith('http') && !faviconUrl.startsWith('data:')) {
    const cleanFavicon = faviconUrl.startsWith('/') ? faviconUrl : `/${faviconUrl}`;
    faviconUrl = `${baseUrl}${cleanFavicon}`;
  }

  const currentUrl = `${baseUrl}${req.originalUrl || req.path}`;

  // Build fully-compliant SEO, OpenGraph and Twitter meta tags block
  let metaBlock = `
    <meta name="description" content="${currentDesc}" />
    <meta name="keywords" content="${currentKeywords}" />
    <meta property="og:title" content="${currentTitle}" />
    <meta property="og:description" content="${currentDesc}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${currentUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${isAr ? nameAr : nameEn}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${currentTitle}" />
    <meta name="twitter:description" content="${currentDesc}" />
    <meta name="twitter:image" content="${imageUrl}" />
  `;

  if (settings.google_site_verification) {
    metaBlock += `\n    <meta name="google-site-verification" content="${settings.google_site_verification}" />`;
  }

  let processedHtml = html;

  // Replace existing title or inject if missing
  if (/<title>[^]*?<\/title>/i.test(processedHtml)) {
    processedHtml = processedHtml.replace(/<title>[^]*?<\/title>/gi, `<title>${currentTitle}</title>`);
  } else {
    processedHtml = processedHtml.replace('</head>', `<title>${currentTitle}</title>\n</head>`);
  }

  // Strip standard viewport/description to prevent duplication
  processedHtml = processedHtml.replace(/<meta\s+name="description"\s+content="[^]*?"\s*\/?>/gi, '');

  // Update favicon reference if customized
  if (settings.favicon_url) {
    processedHtml = processedHtml.replace(/<link\s+rel="icon"\s+type="image\/png"\s+href="[^]*?"\s*\/?>/gi, `<link rel="icon" type="image/png" href="${faviconUrl}" />`);
    processedHtml = processedHtml.replace(/<link\s+rel="icon"\s+href="[^]*?"\s*\/?>/gi, `<link rel="icon" href="${faviconUrl}" />`);
  }

  // Inject metaBlock right before </head>
  processedHtml = processedHtml.replace('</head>', `${metaBlock}\n  </head>`);

  return processedHtml;
}

if (process.env.NODE_ENV === "production") {
  app.use(express.static(distPath, {
    etag: true,
    lastModified: true,
    maxAge: '1y',
    setHeaders: (res, filePath) => {
      if (/\.[a-f0-9]{8,12}\.(js|css)$/.test(filePath) || filePath.includes('/assets/')) {
        // Built hashed files from Vite
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (/\.(js|css)$/.test(filePath)) {
        // Standard JS/CSS (non-hashed fallback)
        res.setHeader('Cache-Control', 'public, max-age=86400');
      } else if (/\.(woff2?|ttf|otf|eot)$/.test(filePath)) {
        // Fonts
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (/\.(png|jpg|jpeg|gif|svg|ico)$/i.test(filePath)) {
        // Images / Favicon
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    }
  }));

  let cachedIndexHtml = '';
  try {
    cachedIndexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
  } catch (err) {
    console.warn('[Server] Could not pre-load index.html for noncing:', err);
  }

  app.get('*', async (req, res) => {
    const hasStaticExtension = /\.((js|css|json|webmanifest|ico|png|jpg|jpeg|gif|svg|woff2?|ttf|otf|mp4|webm|mp3|wav))$/i.test(req.path);
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/') && !hasStaticExtension) {
      try {
        let baseHtml = cachedIndexHtml;
        if (!baseHtml) {
          baseHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
        }

        const settings = await getSystemSettings().catch(() => null);
        const noncedHtml = baseHtml.replace(/<script\b/g, `<script nonce="${res.locals.nonce || ''}"`);
        const finalHtml = settings ? injectSEOTags(noncedHtml, settings, req) : noncedHtml;
        
        res.type('html').send(finalHtml);
      } catch (err) {
        console.error('[SEO] Wildcard serve error:', err);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    } else {
      res.status(404).type('text/plain').send('Not Found');
    }
  });
}

import { globalErrorHandler } from './middleware/error.js';

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Endpoint ${req.originalUrl} not found` });
});

app.use(globalErrorHandler);

export { app };
