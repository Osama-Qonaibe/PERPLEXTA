<div align="center">

<img src="public/logo.png" alt="Perplexta Logo" width="80" height="80" />

# Perplexta Platform

**منصة ذكاء اصطناعي متكاملة | Professional AI-Powered Platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Private-red)](LICENSE)

</div>

---

## 🌐 Languages / اللغات

- [English](#english)
- [العربية](#arabic)

---

<a name="english"></a>
## English

Perplexta is a full-stack, production-grade AI platform offering intelligent chat, file analysis, payments, marketplace, forum, blog, and real-time messaging — all powered by Google Gemini AI with dual PostgreSQL databases.

### ✨ Features

| Module | Description |
|---|---|
| 🤖 **AI Chat** | Streaming conversations via Google Gemini, with memory and file context |
| 📁 **File Analysis** | Upload PDF, Word, Excel, and image files for AI-powered analysis |
| 💳 **Payments** | Stripe-powered subscriptions, wallets, and in-platform transactions |
| 🛒 **Marketplace** | Buy/sell digital products and services |
| 💬 **Forum** | Community discussion boards |
| 📝 **Blog** | Content publishing system |
| 🔔 **Notifications** | Real-time alerts via Socket.IO |
| 📧 **Email** | Transactional emails via Nodemailer |
| 🔐 **KYC** | Identity verification module |
| 🛡️ **Admin Panel** | Full platform management dashboard |
| 📱 **PWA** | Progressive Web App — installable on all devices |

---

### 🏗️ Tech Stack

#### Frontend
- **React 19** + **TypeScript 5.8**
- **Vite 6** — build tool & dev server
- **Tailwind CSS v4** — utility-first styling
- **React Router v7** — client-side routing
- **TanStack Query v5** — server state management
- **Motion (Framer Motion)** — animations
- **Lucide React** — icon system

#### Backend
- **Node.js** + **Express 4** + **TypeScript**
- **Socket.IO 4** — real-time bidirectional events
- **JWT** — stateless authentication
- **bcryptjs** — password hashing
- **Helmet** + **express-rate-limit** — security hardening
- **Multer** — file upload handling

#### AI & Integrations
- **Google Gemini AI** (`@google/genai`) — conversational AI engine
- **Stripe** — payment processing
- **Nodemailer** — email delivery
- **node-cron** — scheduled background jobs

#### Database
- **PostgreSQL 15** (dual-database architecture)
  - `platform_core` — users, chats, plans, forum, blog
  - `platform_ledger` — wallets, transactions, payments

#### DevOps
- **Docker** + **Docker Compose** — containerized deployment
- **esbuild** — server bundling (CJS + ESM output)
- **PM2** — process management (production)

---

### 📁 Project Structure

```
perplexta/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/              # Route-level page components
│   ├── context/            # React Context providers
│   ├── layouts/            # Layout wrappers
│   ├── lib/                # Shared utilities & API clients
│   ├── utils/              # Helper functions
│   └── constants/          # App-wide constants
├── server/                 # Express backend
│   ├── routes/             # API route handlers
│   │   ├── auth.ts         # Authentication & OAuth
│   │   ├── chat.ts         # AI chat endpoints
│   │   ├── payments.ts     # Stripe & billing
│   │   ├── admin.ts        # Admin management
│   │   ├── marketplace.ts  # Product listings
│   │   ├── forum.ts        # Discussion boards
│   │   ├── blog.ts         # Content publishing
│   │   ├── wallet.ts       # Finance operations
│   │   ├── messages.ts     # Direct messaging
│   │   ├── notifications.ts# Push notifications
│   │   ├── files.ts        # File management
│   │   ├── email.ts        # Email delivery
│   │   ├── memory.ts       # AI memory store
│   │   └── kyc.ts          # KYC verification
│   ├── services/           # Business logic services
│   ├── middleware/         # Express middleware
│   ├── db/                 # Database connection & schema
│   ├── jobs/               # Cron job definitions
│   ├── config/             # Configuration modules
│   ├── utils/              # Server-side utilities
│   ├── app.ts              # Express app setup
│   └── index.ts            # Entry point & HTTP/Socket server
├── public/                 # Static assets
├── Dockerfile              # Container image definition
├── docker-compose.yml      # Multi-container orchestration
├── vite.config.ts          # Vite + PWA configuration
├── tsconfig.json           # TypeScript configuration
└── .env.example            # Environment variable template
```

---

### 🚀 Quick Start

#### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- npm 10+

#### 1. Clone & Install

```bash
git clone https://github.com/Osama-Qonaibe/perplexta.git
cd perplexta
npm install
```

#### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in all required values:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/platform_core
LEDGER_DATABASE_URL=postgresql://user:password@localhost:5432/platform_ledger
JWT_SECRET=your_secure_jwt_secret
ENCRYPTION_KEY=your_32_char_encryption_key_!
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
STRIPE_SECRET_KEY=sk_test_your_stripe_key
```

#### 3. Run in Development

```bash
npm run dev
```

The server starts on `http://localhost:3000` serving both the API and the frontend.

---

### 🐳 Docker Deployment

The fastest way to deploy on any server.

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your production values

# 2. Build & start all services
docker-compose up -d --build

# 3. Check logs
docker-compose logs -f app
```

Services started:
- `platform_app` — Node.js application (port 3000)
- `platform_db_core` — Core PostgreSQL database
- `platform_db_ledger` — Ledger PostgreSQL database

---

### 🔧 Production Deployment (PM2)

```bash
# Build the project
npm run build

# Start with PM2
pm2 start dist/server.cjs --name perplexta

# Save PM2 process list
pm2 save
pm2 startup
```

---

### ⚙️ Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server (tsx) |
| `npm run build` | Build frontend (Vite) + backend (esbuild) |
| `npm run start` | Run production build |
| `npm run lint` | TypeScript type checking |
| `npm run clean` | Remove dist directory |

---

### 🔒 Security

- JWT-based stateless authentication with refresh logic
- AES-256 encryption key for sensitive data
- Rate limiting on all API endpoints via `express-rate-limit`
- Security headers via `Helmet`
- CORS configured with explicit origin allowlist
- Password hashing with `bcryptjs`
- Stripe webhook signature verification

> ⚠️ **Important:** Never commit your `.env` file. Change `JWT_SECRET`, `ENCRYPTION_KEY`, and `ADMIN_PASSWORD` before any production deployment.

---

### 📦 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | Server listening port (default: 3000) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `DATABASE_URL` | ✅ | Core database connection string |
| `LEDGER_DATABASE_URL` | ✅ | Ledger database connection string |
| `JWT_SECRET` | ✅ | JWT signing secret (min 32 chars) |
| `ENCRYPTION_KEY` | ✅ | AES-256 key — exactly 32 characters |
| `ADMIN_EMAIL` | ✅ | Super admin email address |
| `ADMIN_PASSWORD` | ✅ | Initial admin password |
| `APP_URL` | ✅ | Public URL of the application |
| `CORS_ALLOWED_ORIGINS` | ✅ | Comma-separated allowed origins |
| `GOOGLE_CLIENT_ID` | ⚪ | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | ⚪ | Google OAuth Client Secret |
| `STRIPE_SECRET_KEY` | ⚪ | Stripe secret key for payments |
| `DB_SSL_REQUIRED` | ⚪ | `true` for cloud DBs, `false` for local |

---

<a name="arabic"></a>
---

## العربية

منصة Perplexta هي منصة ذكاء اصطناعي متكاملة للإنتاج، تقدم محادثات ذكية، تحليل ملفات، مدفوعات، سوق إلكتروني، منتدى، مدونة، ورسائل فورية — مدعومة بـ Google Gemini AI مع قاعدتَي بيانات PostgreSQL منفصلتَين.

### ✨ الميزات

| الوحدة | الوصف |
|---|---|
| 🤖 **محادثة AI** | محادثات تدفقية عبر Google Gemini مع دعم الذاكرة وملفات السياق |
| 📁 **تحليل الملفات** | رفع PDF وWord وExcel والصور لتحليلها بالذكاء الاصطناعي |
| 💳 **المدفوعات** | اشتراكات ومحافظ ومعاملات داخل المنصة عبر Stripe |
| 🛒 **السوق الإلكتروني** | شراء وبيع المنتجات والخدمات الرقمية |
| 💬 **المنتدى** | لوحات النقاش المجتمعي |
| 📝 **المدونة** | نظام نشر المحتوى |
| 🔔 **الإشعارات** | تنبيهات فورية عبر Socket.IO |
| 📧 **البريد الإلكتروني** | رسائل المعاملات عبر Nodemailer |
| 🔐 **KYC** | وحدة التحقق من الهوية |
| 🛡️ **لوحة الإدارة** | لوحة إدارة شاملة للمنصة |
| 📱 **PWA** | تطبيق ويب تقدمي قابل للتثبيت على جميع الأجهزة |

---

### 🏗️ التقنيات المستخدمة

#### الواجهة الأمامية (Frontend)
- **React 19** + **TypeScript 5.8**
- **Vite 6** — أداة البناء وخادم التطوير
- **Tailwind CSS v4** — تصميم المكونات
- **React Router v7** — التوجيه
- **TanStack Query v5** — إدارة حالة الخادم
- **Motion** — الرسوم المتحركة
- **Lucide React** — أيقونات

#### الواجهة الخلفية (Backend)
- **Node.js** + **Express 4** + **TypeScript**
- **Socket.IO 4** — الاتصال الثنائي الفوري
- **JWT** — المصادقة عديمة الحالة
- **bcryptjs** — تشفير كلمات المرور
- **Helmet** + **express-rate-limit** — تأمين الخادم

#### الذكاء الاصطناعي والتكاملات
- **Google Gemini AI** — محرك المحادثة الذكي
- **Stripe** — معالجة المدفوعات
- **Nodemailer** — إرسال البريد الإلكتروني
- **node-cron** — المهام المجدولة في الخلفية

#### قاعدة البيانات
- **PostgreSQL 15** (معمارية قاعدتي بيانات منفصلتَين)
  - `platform_core` — المستخدمون والمحادثات والخطط والمنتدى والمدونة
  - `platform_ledger` — المحافظ والمعاملات والمدفوعات

---

### 🚀 البدء السريع

#### المتطلبات
- Node.js 20+
- PostgreSQL 15+
- npm 10+

#### 1. الاستنساخ والتثبيت

```bash
git clone https://github.com/Osama-Qonaibe/perplexta.git
cd perplexta
npm install
```

#### 2. إعداد البيئة

```bash
cp .env.example .env
```

افتح ملف `.env` وأدخل جميع القيم المطلوبة (راجع جدول متغيرات البيئة في قسم English).

#### 3. التشغيل في وضع التطوير

```bash
npm run dev
```

يعمل الخادم على `http://localhost:3000` ويخدم الـ API والواجهة الأمامية معاً.

---

### 🐳 النشر بـ Docker

أسرع طريقة للنشر على أي خادم.

```bash
# 1. نسخ وإعداد ملف البيئة
cp .env.example .env

# 2. بناء وتشغيل جميع الخدمات
docker-compose up -d --build

# 3. متابعة السجلات
docker-compose logs -f app
```

الخدمات التي سيتم تشغيلها:
- `platform_app` — تطبيق Node.js (المنفذ 3000)
- `platform_db_core` — قاعدة البيانات الأساسية
- `platform_db_ledger` — قاعدة بيانات المحاسبة

---

### 🔧 النشر الإنتاجي بـ PM2

```bash
# بناء المشروع
npm run build

# التشغيل بـ PM2
pm2 start dist/server.cjs --name perplexta

# حفظ إعدادات PM2
pm2 save
pm2 startup
```

---

### 🔒 الأمان

- مصادقة JWT بدون حالة مع منطق التحديث
- مفتاح تشفير AES-256 للبيانات الحساسة
- تحديد معدل الطلبات على جميع نقاط API
- رؤوس HTTP آمنة عبر Helmet
- CORS مع قائمة بيضاء صريحة للأصول
- تشفير كلمات المرور بـ bcryptjs
- التحقق من توقيع Webhook لـ Stripe

> ⚠️ **تحذير:** لا ترفع ملف `.env` إلى GitHub. غيّر قيم `JWT_SECRET` و`ENCRYPTION_KEY` و`ADMIN_PASSWORD` قبل أي نشر إنتاجي.

---

<div align="center">

Built with ❤️ by [Osama Qonaibe](https://github.com/Osama-Qonaibe)

</div>
