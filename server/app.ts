import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { globalLimiter, adminLimiter, authLimiter } from './middleware/rateLimit.js';
import { csrfProtection } from './middleware/csrf.js';

const app = express();

const trustProxyVal = process.env.TRUST_PROXIES || '1';
app.set('trust proxy', trustProxyVal === '1' ? 1 : (isNaN(Number(trustProxyVal)) ? trustProxyVal.split(',').map(s => s.trim()) : Number(trustProxyVal)));

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
  crossOriginEmbedderPolicy: false
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

const getContentType = (filePath: string): string | null => {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.webmanifest':
      return 'application/manifest+json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml; charset=utf-8';
    case '.ico':
      return 'image/x-icon';
    case '.xml':
      return 'application/xml; charset=utf-8';
    default:
      return null;
  }
};

const serveStaticResource = (fileName: string, fallbackFileName?: string) => {
  return (req: express.Request, res: express.Response) => {
    const distFile = path.join(distPath, fileName);
    const publicFile = path.join(publicPath, fileName);
    
    let targetFile = '';
    if (fs.existsSync(distFile)) {
      targetFile = distFile;
    } else if (fs.existsSync(publicFile)) {
      targetFile = publicFile;
    } else if (fallbackFileName) {
      const distFallback = path.join(distPath, fallbackFileName);
      const publicFallback = path.join(publicPath, fallbackFileName);
      if (fs.existsSync(distFallback)) {
        targetFile = distFallback;
      } else if (fs.existsSync(publicFallback)) {
        targetFile = publicFallback;
      }
    }
    
    if (targetFile) {
      const contentType = getContentType(targetFile);
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      return res.sendFile(targetFile);
    }
    
    res.status(404).type('text/plain').send('Not Found');
  };
};

app.get('/manifest.json', serveStaticResource('manifest.json', 'manifest.webmanifest'));
app.get('/manifest.webmanifest', serveStaticResource('manifest.webmanifest', 'manifest.json'));
app.get('/sw.js', serveStaticResource('sw.js'));
app.get('/registerSW.js', serveStaticResource('registerSW.js'));

app.use(express.static(publicPath, {
  setHeaders: (res, filePath) => {
    const contentType = getContentType(filePath);
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
  }
}));

import jwt from 'jsonwebtoken';
import { pool, ledgerPool } from './db/index.js';

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
        const isUserFileRes = await pool.query('SELECT id FROM user_files WHERE user_id = $1 AND file_url = $2', [user.id, filename]);
        if (isUserFileRes.rows.length > 0) {
          return res.sendFile(resolvedPath);
        }

        const isProofRes = await (ledgerPool || pool).query('SELECT id FROM deposit_requests WHERE user_id = $1 AND proof_url LIKE $2', [user.id, `%${filename}%`]);
        if (isProofRes.rows.length > 0) {
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

app.use('/api/auth', authLimiter, authRoutes);
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

const isProduction = process.env.NODE_ENV === 'production' || !fs.existsSync(path.join(process.cwd(), 'src'));

if (isProduction) {
  app.use(express.static(distPath, {
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
      const contentType = getContentType(filePath);
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      if (/\.(js|css)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));

  let cachedIndexHtml = '';
  try {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      cachedIndexHtml = fs.readFileSync(indexPath, 'utf8');
    }
  } catch (err) {
    console.warn('[Server] Could not pre-load index.html for noncing:', err);
  }

  app.get('*', (req, res) => {
    const hasStaticExtension = /\.(js|css|json|webmanifest|ico|png|jpg|jpeg|gif|svg|woff2?|ttf|otf|mp4|webm|mp3|wav)$/i.test(req.path);
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/') && !hasStaticExtension) {
      if (cachedIndexHtml) {
        const noncedHtml = cachedIndexHtml.replace(/<script\b/g, `<script nonce="${res.locals.nonce || ''}"`);
        res.type('html').send(noncedHtml);
      } else {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).type('text/plain').send('Index.html not found');
        }
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
