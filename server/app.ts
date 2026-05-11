import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { globalLimiter } from './middleware/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src * 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src * 'self' 'unsafe-inline'; img-src * 'self' data: blob:; connect-src * 'self' 'unsafe-inline' 'unsafe-eval' blob: ws: wss:; frame-ancestors * 'self';"
  );
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request Logger
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[API Request] ${req.method} ${req.path}`);
  }
  next();
});

// --- STATIC ASSETS ---
const publicPath = path.join(process.cwd(), 'public');
const uploadsPath = path.join(process.cwd(), 'uploads');

app.use(express.static(publicPath));
app.use('/uploads', express.static(uploadsPath));

app.use('/api', globalLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Registry for routes (we'll add them one by one)
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
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

app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user', userRoutes); // Singular alias
app.use('/api/wallet', walletRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api', systemRoutes);
app.use('/api', toolRoutes);

// Explicit economy fallback for robustness
app.get('/api/economy', async (req, res) => {
  try {
    const { pool: dbPool } = await import('./db/index.js');
    if (!dbPool) return res.json({ points_per_dollar: 100, min_payout_usd: 10, min_deposit_usd: 5, referral_bonus_percent: 10 });
    const result = await dbPool.query('SELECT points_per_dollar, min_payout_usd, min_deposit_usd, referral_bonus_percent FROM system_settings LIMIT 1');
    res.json(result.rows[0] || { points_per_dollar: 100, min_payout_usd: 10, min_deposit_usd: 5, referral_bonus_percent: 10 });
  } catch (e) {
    res.json({ points_per_dollar: 100, min_payout_usd: 10, min_deposit_usd: 5, referral_bonus_percent: 10 });
  }
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/uploads/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// --- API 404 HANDLER ---
// Should be AFTER other routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Endpoint ${req.originalUrl} not found` });
});

export { app };
