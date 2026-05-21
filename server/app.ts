import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { globalLimiter, adminLimiter } from './middleware/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (req: any, res: any) => `'nonce-${res.locals.nonce}'`],
      styleSrc: ["'self'", (req: any, res: any) => `'nonce-${res.locals.nonce}'`, "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.stripe.com", "https://*.googleapis.com"],
      connectSrc: ["'self'", "wss:", "ws:", "https://*.googleapis.com", "https://api.stripe.com", "https://checkout.stripe.com", "https://maps.googleapis.com"],
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
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, strictly enforce allowed origins. In dev, allow all.
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

app.use(express.json({ limit: '10mb' }));
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

// Middleware to serve manifest and service worker files from either dist or public
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
import { pool } from './db/index.js';

app.get('/uploads/:filename', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsPath, filename);

    // Secure Verification: Absolute path traversal guarding
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(uploadsPath))) {
      return res.status(403).json({ error: 'Access denied: Path traversal attempt blocked.' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = path.extname(filename).toLowerCase();
    const publicExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

    // Avatars/visual images are accessed publicly to ensure perfect browser rendering behavior
    if (publicExtensions.includes(ext)) {
      return res.sendFile(resolvedPath);
    }

    // High Security documents check: verify authentication & ownership
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

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

      // Check database to ensure document ownership
      try {
        const isUserFileRes = await pool.query('SELECT id FROM user_files WHERE user_id = $1 AND file_url = $2', [user.id, filename]);
        if (isUserFileRes.rows.length > 0) {
          return res.sendFile(resolvedPath);
        }

        const isProofRes = await pool.query('SELECT id FROM deposit_requests WHERE user_id = $1 AND proof_url LIKE $2', [user.id, `%${filename}%`]);
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

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/mail-services-v3', emailRoutes);
app.use('/api', systemRoutes);
app.use('/api', toolRoutes);

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    // Check if path has a static file extension to prevent sending HTML index for missing assets
    const hasStaticExtension = /\.(js|css|json|webmanifest|ico|png|jpg|jpeg|gif|svg|woff2?|ttf|otf|mp4|webm|mp3|wav)$/i.test(req.path);
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/') && !hasStaticExtension) {
      res.sendFile(path.join(distPath, 'index.html'));
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
