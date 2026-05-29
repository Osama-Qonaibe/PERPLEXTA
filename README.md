<div align="center">

# Perplexta

**A full-stack AI-powered conversation platform built for production.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-8-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)

</div>

---

## Overview

Perplexta is a production-grade AI conversation platform. It features a React + Vite frontend, an Express + Node.js backend, dual PostgreSQL databases (core & ledger), real-time communication via Socket.IO, and integrated payment processing through Stripe. The platform supports subscription plans, a user wallet system, file uploads, a community forum, a blog, and a full admin dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 6, TypeScript, Tailwind CSS v4, React Router v7, TanStack Query v5 |
| **Backend** | Node.js, Express 4, TypeScript, tsx |
| **Database** | PostgreSQL (pg v8) — dual database architecture |
| **AI** | Google Generative AI (`@google/genai`) |
| **Auth** | JWT (`jsonwebtoken`), bcryptjs, Google OAuth |
| **Payments** | Stripe SDK v22 |
| **Real-time** | Socket.IO v4 |
| **File Processing** | Multer, pdf-parse, mammoth, html-to-text |
| **Email** | Nodemailer |
| **Jobs** | node-cron |
| **Security** | Helmet, express-rate-limit, AES-256 encryption |
| **Containerization** | Docker, docker-compose |
| **Export** | jsPDF, ExcelJS, html2canvas |

---

## Project Structure

```
perplexta/
├── src/                        # React frontend
│   └── (pages, components, hooks, context)
├── server/                     # Express backend
│   ├── index.ts                # Server entry point
│   ├── app.ts                  # Express app setup
│   ├── config/                 # Configuration (DB, env)
│   ├── db/                     # Database schemas & migrations
│   ├── routes/                 # API route handlers
│   │   ├── admin.ts            # Admin panel endpoints
│   │   ├── auth.ts             # Authentication & OAuth
│   │   ├── chat.ts             # AI chat sessions
│   │   ├── payments.ts         # Stripe & billing
│   │   ├── wallet.ts           # User wallet & transactions
│   │   ├── marketplace.ts      # Marketplace module
│   │   ├── forum.ts            # Community forum
│   │   ├── blog.ts             # Blog system
│   │   ├── files.ts            # File upload & parsing
│   │   ├── messages.ts         # Direct messaging
│   │   ├── notifications.ts    # Notification system
│   │   ├── memory.ts           # AI memory persistence
│   │   ├── tools.ts            # AI tools
│   │   ├── kyc.ts              # KYC verification
│   │   ├── email.ts            # Email delivery
│   │   ├── plans.ts            # Subscription plans
│   │   ├── subscriptions.ts    # Subscription management
│   │   ├── system.ts           # System health & config
│   │   └── users.ts            # User management
│   ├── services/               # Business logic services
│   ├── middleware/             # Auth, rate limiting, etc.
│   ├── jobs/                   # Scheduled cron jobs
│   └── utils/                  # Shared utilities
├── public/                     # Static assets
├── .env.example                # Environment variable template
├── Dockerfile                  # Docker image definition
├── docker-compose.yml          # Multi-container orchestration
├── vite.config.ts              # Vite build configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies & scripts
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- A Google Cloud project (for AI + OAuth)
- A Stripe account (for payments)

### 1. Clone & Install

```bash
git clone https://github.com/Osama-Qonaibe/perplexta.git
cd perplexta
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in all required values. See the [Environment Variables](#environment-variables) section below.

### 3. Set Up Databases

Create two PostgreSQL databases:

```sql
CREATE DATABASE platform_core;
CREATE DATABASE platform_ledger;
```

The server will auto-run migrations on startup.

### 4. Run in Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### 5. Build for Production

```bash
npm run build
npm start
```

---

## Docker Deployment

### Using docker-compose (Recommended)

```bash
# Copy and configure environment
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Using Docker directly

```bash
docker build -t perplexta .
docker run -p 3000:3000 --env-file .env perplexta
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure the following:

### Network

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server listen port | `3000` |
| `NODE_ENV` | Environment mode | `production` |
| `APP_URL` | Primary application URL | `http://localhost:3000` |
| `VITE_APP_URL` | Frontend app URL (must match APP_URL) | `http://localhost:3000` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed CORS origins | — |

### Database

| Variable | Description |
|---|---|
| `DATABASE_URL` | Core database (users, chats, plans) |
| `LEDGER_DATABASE_URL` | Finance database (wallets, transactions) |
| `DB_SSL_REQUIRED` | Set `false` for local, `true` for cloud DBs |

### Security

| Variable | Description |
|---|---|
| `ENCRYPTION_KEY` | AES-256 master key — **must be exactly 32 characters** |
| `JWT_SECRET` | JWT signing secret — **change before production** |

### Admin

| Variable | Description |
|---|---|
| `ADMIN_EMAIL` | Master administrator email |
| `VITE_ADMIN_EMAIL` | Admin email for frontend dashboard access |
| `ADMIN_PASSWORD` | Initial admin password — **change after first login** |

### Integrations

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (configurable via Admin Panel) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

---

## NPM Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server (frontend + backend) |
| `npm run build` | Build frontend (Vite) and bundle server (esbuild) |
| `npm start` | Run production build |
| `npm run preview` | Preview production build locally |
| `npm run clean` | Remove `dist/` directory |
| `npm run lint` | TypeScript type-check (no emit) |

---

## API Overview

All API routes are prefixed with `/api`.

| Prefix | Module |
|---|---|
| `/api/auth` | Registration, login, Google OAuth, password reset |
| `/api/chat` | AI chat sessions and message history |
| `/api/users` | User profile management |
| `/api/payments` | Stripe checkout, subscriptions, webhooks |
| `/api/wallet` | User wallet balance and transaction ledger |
| `/api/plans` | Subscription plan listing |
| `/api/subscriptions` | Active subscription status |
| `/api/marketplace` | Marketplace listings and purchases |
| `/api/forum` | Community forum posts and replies |
| `/api/blog` | Blog posts and categories |
| `/api/files` | File upload and document parsing |
| `/api/messages` | Direct user-to-user messaging |
| `/api/notifications` | In-app notification feed |
| `/api/memory` | AI conversation memory |
| `/api/tools` | AI tool integrations |
| `/api/email` | Transactional email delivery |
| `/api/kyc` | KYC identity verification |
| `/api/system` | Health checks and system configuration |
| `/api/admin` | Full admin panel (protected) |

---

## Security

- **Authentication:** JWT access tokens with bcryptjs password hashing.
- **Encryption:** AES-256 for sensitive data at rest.
- **HTTP Security:** Helmet middleware sets secure headers on every response.
- **Rate Limiting:** `express-rate-limit` applied globally to prevent abuse.
- **CORS:** Strict origin allowlist via `CORS_ALLOWED_ORIGINS`.
- **Dependency Hardening:** `uuid` overridden to `^11.1.1` in `package.json` to resolve inherited vulnerabilities.

---

## Database Architecture

The platform uses a **dual-database** design for isolation:

- **`platform_core`** — Stores users, chat sessions, plans, blog posts, forum content, marketplace, notifications, and KYC data.
- **`platform_ledger`** — Stores wallets, transaction history, and financial records. Isolated to limit blast radius in case of a data incident.

---

## Real-time Features

Socket.IO powers live features including:
- Real-time AI response streaming
- Live notification delivery
- Direct messaging between users

---

## License

This project is private. All rights reserved.
