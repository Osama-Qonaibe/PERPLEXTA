<div align="center">

<img src="public/logo.svg" alt="Perplexta Logo" width="80" height="80" />

# Perplexta Platform

**منصة المحادثة الذكية المتكاملة · Intelligent AI Conversation Platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169e1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Private-red)](LICENSE)

---

[🇦🇪 العربية](#-نظرة-عامة) · [🇬🇧 English](#-overview)

</div>

---

## 🇦🇪 نظرة عامة

**Perplexta** منصة SaaS متكاملة للمحادثة مع الذكاء الاصطناعي، مبنية على معمارية Full-Stack حديثة. توفر المنصة محادثات AI مدعومة بـ Google Gemini، نظام محافظ رقمية، بوابة دفع عبر Stripe، لوحة إدارة شاملة، وسوق إضافات قابل للتوسع.

## 🇬🇧 Overview

**Perplexta** is a full-featured AI SaaS platform powered by Google Gemini, offering persistent conversations, a digital wallet system, Stripe-based subscriptions, a comprehensive admin dashboard, and an extensible plugin marketplace — all in a single deployable stack.

---

## ✨ Features / المميزات

| Feature | الميزة |
|---------|--------|
| AI Chat with Google Gemini (streaming) | محادثة AI مع Google Gemini (بث مباشر) |
| Persistent conversation history | حفظ سجل المحادثات |
| File upload & AI analysis (PDF, DOCX, images) | رفع الملفات وتحليلها بالذكاء الاصطناعي |
| Subscription plans + Stripe payments | خطط اشتراك + بوابة Stripe |
| Digital wallet with transaction ledger | محفظة رقمية مع دفتر حسابات |
| Plugin / Tools marketplace | سوق إضافات وأدوات |
| Community forum & blog | منتدى مجتمعي ومدونة |
| Real-time notifications (Socket.IO) | إشعارات فورية عبر Socket.IO |
| Google OAuth 2.0 authentication | تسجيل دخول بـ Google OAuth 2.0 |
| Role-based access control (RBAC) | نظام صلاحيات متعدد الأدوار |
| Full admin dashboard | لوحة إدارة شاملة |
| KYC verification flow | نظام التحقق من الهوية KYC |
| PWA support (offline-ready) | دعم PWA للعمل بدون إنترنت |
| Docker & Docker Compose deployment | نشر عبر Docker و Docker Compose |
| Export to PDF / Excel | تصدير البيانات إلى PDF و Excel |

---

## 🏗️ Architecture / البنية التقنية

```
perplexta/
├── src/                        # React 19 + Vite Frontend
│   ├── components/             # Reusable UI components
│   ├── pages/                  # Route-based page components
│   ├── layouts/                # Layout wrappers
│   ├── context/                # React Context providers
│   ├── lib/                    # API client, utilities
│   ├── utils/                  # Helper functions
│   └── constants/              # App-wide constants
│
├── server/                     # Express.js Backend (TypeScript)
│   ├── routes/                 # API route handlers
│   │   ├── auth.ts             # Authentication & OAuth
│   │   ├── chat.ts             # AI chat endpoints
│   │   ├── admin.ts            # Admin panel APIs
│   │   ├── payments.ts         # Stripe integration
│   │   ├── wallet.ts           # Digital wallet
│   │   ├── marketplace.ts      # Plugin marketplace
│   │   ├── forum.ts            # Community forum
│   │   ├── blog.ts             # Blog system
│   │   ├── files.ts            # File upload & processing
│   │   ├── notifications.ts    # Push notifications
│   │   ├── messages.ts         # Direct messaging
│   │   ├── memory.ts           # AI memory/context
│   │   ├── tools.ts            # AI tools
│   │   ├── kyc.ts              # Identity verification
│   │   ├── users.ts            # User management
│   │   ├── email.ts            # Email service
│   │   ├── subscriptions.ts    # Plan subscriptions
│   │   └── plans.ts            # Pricing plans
│   ├── db/                     # Database connection & queries
│   ├── services/               # Business logic services
│   ├── middleware/             # Auth, rate-limit middleware
│   ├── config/                 # App configuration
│   ├── jobs/                   # Cron jobs (node-cron)
│   ├── utils/                  # Server utilities
│   ├── app.ts                  # Express app setup
│   └── index.ts                # Server entry point
│
├── public/                     # Static assets
├── Dockerfile                  # Docker image definition
├── docker-compose.yml          # Multi-container deployment
├── vite.config.ts              # Vite + PWA configuration
├── tsconfig.json               # TypeScript configuration
└── .env.example                # Environment variables template
```

---

## 🗄️ Databases / قواعد البيانات

المنصة تستخدم قاعدتَي بيانات PostgreSQL منفصلتين:

| Database | Purpose | الغرض |
|----------|---------|--------|
| `platform_core` | Users, chats, plans, forum, blog | المستخدمون، المحادثات، الخطط، المنتدى |
| `platform_ledger` | Wallets, transactions, payments | المحافظ، المعاملات المالية |

---

## ⚙️ Tech Stack / التقنيات المستخدمة

### Frontend
- **React 19** · **Vite 6** · **TypeScript 5.8**
- **Tailwind CSS v4** · **Lucide React** · **Motion**
- **TanStack Query v5** · **React Router v7**
- **Socket.IO Client** · **PWA** (vite-plugin-pwa)
- **react-markdown** · **PrismJS** · **jsPDF** · **ExcelJS**

### Backend
- **Node.js** · **Express 4** · **TypeScript**
- **PostgreSQL** (pg driver) · **Socket.IO**
- **JWT** (jsonwebtoken) · **bcryptjs**
- **Helmet** · **express-rate-limit** · **CORS**
- **Multer** · **pdf-parse** · **mammoth** · **nodemailer**
- **Stripe SDK** · **Google GenAI SDK**
- **node-cron** · **dotenv**

---

## 🚀 Quick Start / البدء السريع

### Prerequisites / المتطلبات
- Node.js `>= 20`
- PostgreSQL `>= 15`
- Google Gemini API Key
- Stripe Account (optional)

### 1. Clone & Install / الاستنساخ والتثبيت

```bash
git clone https://github.com/Osama-Qonaibe/perplexta.git
cd perplexta
npm install
```

### 2. Environment Setup / إعداد المتغيرات البيئية

```bash
cp .env.example .env
```

Edit `.env` with your values — see [Environment Variables](#️-environment-variables--المتغيرات-البيئية) section below.

### 3. Development / التطوير

```bash
npm run dev
```

App runs at: `http://localhost:3000`

### 4. Production Build / بناء الإنتاج

```bash
npm run build
npm start
```

---

## 🐳 Docker Deployment / النشر بـ Docker

### Using Docker Compose (Recommended)

```bash
# Copy and configure environment
cp .env.example .env

# Start all services (app + 2 PostgreSQL databases)
docker compose up -d

# View logs
docker compose logs -f app

# Stop services
docker compose down
```

Services started:

| Service | Container | Port |
|---------|-----------|------|
| App | `platform_app` | `3000` |
| Core DB | `platform_db_core` | internal |
| Ledger DB | `platform_db_ledger` | internal |

### Manual Docker Build

```bash
docker build -t perplexta .
docker run -p 3000:3000 --env-file .env perplexta
```

---

## 🔐 Environment Variables / المتغيرات البيئية

Copy `.env.example` to `.env` and fill in the values:

```env
# ── Network ──────────────────────────────────────
PORT=3000
NODE_ENV=production
APP_URL=https://yourdomain.com
VITE_APP_URL=https://yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# ── Databases ─────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/platform_core
LEDGER_DATABASE_URL=postgresql://user:password@localhost:5432/platform_ledger
DB_SSL_REQUIRED=false

# ── Security ──────────────────────────────────────
ENCRYPTION_KEY=your_secure_32_chars_key_here_!   # Exactly 32 characters
JWT_SECRET=your_secure_jwt_secret_here

# ── Admin ─────────────────────────────────────────
ADMIN_EMAIL=admin@example.com
VITE_ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_after_first_login

# ── Google Gemini AI ──────────────────────────────
# Add your Gemini API key via the Admin Panel after setup

# ── Google OAuth ──────────────────────────────────
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# ── Stripe (Optional) ─────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
```

> ⚠️ **Security**: Never commit `.env` to version control. Change all default passwords before production deployment.

---

## 🔑 API Routes / مسارات API

| Module | Prefix | Description |
|--------|--------|-------------|
| Auth | `/api/auth` | Register, login, Google OAuth, password reset |
| Chat | `/api/chat` | AI conversations, history, streaming |
| Users | `/api/users` | Profile management |
| Payments | `/api/payments` | Stripe checkout, webhooks |
| Wallet | `/api/wallet` | Balance, deposits, withdrawals |
| Subscriptions | `/api/subscriptions` | Plan management |
| Plans | `/api/plans` | Available pricing plans |
| Marketplace | `/api/marketplace` | Plugin store |
| Forum | `/api/forum` | Community posts & threads |
| Blog | `/api/blog` | Blog posts (public + admin) |
| Files | `/api/files` | Upload & AI processing |
| Notifications | `/api/notifications` | User notifications |
| Messages | `/api/messages` | Direct messaging |
| Memory | `/api/memory` | AI conversation memory |
| Tools | `/api/tools` | AI productivity tools |
| KYC | `/api/kyc` | Identity verification |
| Email | `/api/email` | Email sending |
| System | `/api/system` | Health check, system info |
| Admin | `/api/admin` | Full admin panel APIs |

---

## 🔒 Security / الأمان

- **Helmet.js** — HTTP security headers
- **express-rate-limit** — API rate limiting
- **bcryptjs** — Password hashing
- **JWT** — Stateless session tokens
- **AES-256** — Encryption for sensitive data (`ENCRYPTION_KEY`)
- **CORS** — Restricted to allowed origins
- **RBAC** — Role-based access control (user / admin)
- **uuid override** — `uuid ^11.1.1` enforced via npm overrides to patch `exceljs` dependency vulnerability

---

## 📜 Available Scripts / الأوامر المتاحة

```bash
npm run dev       # Start development server (tsx watch)
npm run build     # Build frontend + bundle server (ESM + CJS)
npm start         # Start production server
npm run preview   # Preview Vite production build
npm run clean     # Remove dist/ directory
npm run lint      # TypeScript type checking (tsc --noEmit)
```

---

## 🤝 Contributing / المساهمة

This is a private repository. Contributions are by invitation only.

هذا مستودع خاص. المساهمات بدعوة فقط.

---

## 📄 License / الرخصة

**Private** — All rights reserved © 2026 Perplexta Platform.

---

<div align="center">
Built with ❤️ by <a href="https://github.com/Osama-Qonaibe">Osama Qonaibe</a>
</div>
