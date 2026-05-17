# PERPLEXTA

> **Sovereign AI Platform** — A production-grade, full-stack AI assistant platform with multi-provider orchestration, dual-database financial isolation, subscription management, and real-time intelligence.

![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Node.js%20%2B%20PostgreSQL-10b981?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-Full--Stack-3178c6?style=flat-square)
![License](https://img.shields.io/badge/License-Private-red?style=flat-square)

---

## Overview

PERPLEXTA is a multi-tool AI platform that allows users to interact with multiple AI models through a unified, secure interface. It features a sovereign dual-database architecture separating core application data from all financial operations.

**Key capabilities:**
- Multi-provider AI orchestration (OpenAI, Anthropic, Google, Groq, and more) with automatic fallback
- Real-time streaming responses via Socket.IO
- Dual-language interface (Arabic / English) with full RTL support
- Subscription-based access control with Stripe integration
- Internal wallet system with points, referrals, and withdrawals
- Admin dashboard for full platform control

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS v4 |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Core DB) + PostgreSQL (Ledger DB) |
| Auth | JWT, Token Blacklist, Google OAuth 2.0 |
| Payments | Stripe Subscriptions + Internal Wallet |
| Real-time | Socket.IO |
| AI | Multi-provider via dynamic Orchestrator |
| Scheduler | node-cron |
| Containers | Docker + docker-compose |
| Security | Helmet, CORS, express-rate-limit, bcryptjs, AES-256 |

---

## Architecture

### Dual-Database Design

The platform uses two isolated PostgreSQL databases:

| Database | Purpose | Tables |
|----------|---------|--------|
| **Core DB** | Users, chats, subscriptions, settings, notifications | 27 tables |
| **Ledger DB** | Wallets, transactions, referrals, KYC, withdrawals | 11 tables |

This isolation ensures that **no financial operation can be corrupted by application-level bugs** in the core system. Cross-database referential integrity is enforced at the application layer.

### AI Orchestrator

Every AI tool is configured in the `tool_orchestrator` table with:
- A primary provider + model
- Up to 3 fallback providers + models
- Per-tool daily budget enforcement
- Automatic failover with full logging

---

## Database Schema

### Core DB (27 tables)

`users` · `chats` · `messages` · `api_keys_vault` · `tool_orchestrator` · `plans` · `subscriptions` · `user_usage` · `notifications` · `chat_memories` · `email_templates` · `email_settings` · `campaigns` · `ai_logs` · `message_reports` · `user_shortcuts` · `task_logs` · `user_activity_logs` · `system_settings` · `system_broadcasts` · `user_files` · `security_alerts` · `system_logs` · `token_blacklist` · `password_resets` · `support_tickets` · `support_ticket_replies` · `oauth_states` · `plan_features_history` · `migration_history` · `db_connections_registry`

### Ledger DB (11 tables)

`wallets` · `ledger_transactions` · `referrals` · `referral_tree` · `kyc_requests` · `withdrawal_requests` · `payout_accounts` · `economy_settings` · `user_usage_logs` · `coupons` · `coupon_usages` · `stripe_events` · `deposit_requests`

---

## Requirements

- Node.js >= 18
- PostgreSQL >= 14 (two separate databases)
- A valid `JWT_SECRET` (min 32 chars)
- At least one AI provider API key configured via the Admin Dashboard

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all required values.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Core PostgreSQL connection string |
| `LEDGER_DATABASE_URL` | ✅ | Ledger PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens (min 32 chars) |
| `ENCRYPTION_KEY` | ✅ | AES-256 key for encrypting stored secrets (32 chars hex) |
| `APP_URL` | ✅ | Full public URL of the app (e.g. `https://yourdomain.com`) |
| `ADMIN_EMAIL` | ✅ | Email address of the master admin account |
| `ADMIN_PASSWORD` | ✅ | Initial password for the admin account (set strong password) |
| `GOOGLE_CLIENT_ID` | ⚠️ | Required only if Google OAuth is enabled |
| `GOOGLE_CLIENT_SECRET` | ⚠️ | Required only if Google OAuth is enabled |
| `CORS_ALLOWED_ORIGINS` | ⚠️ | Comma-separated list of allowed origins in production |
| `NODE_ENV` | ⚠️ | Set to `production` for production deployments |
| `DB_SSL_REQUIRED` | ⚠️ | Set to `false` to disable SSL for local DB connections |
| `VITE_APP_URL` | optional | Frontend base URL override |
| `VITE_ADMIN_EMAIL` | optional | Admin email override for frontend |

> **Security:** Never commit real secrets to version control. All AI provider API keys and Stripe keys are stored encrypted in the database and managed via the Admin Dashboard — not in `.env`.

---

## Installation

```bash
git clone https://github.com/Osama-Qonaibe/perplexta.git
cd perplexta
npm install
cp .env.example .env
# Fill in .env values
npm run dev
```

The server automatically runs all database migrations on startup. On first run it will:
1. Create all required tables across both databases
2. Seed default plans (Starter, Pro, Elite)
3. Seed default AI tools in the orchestrator
4. Create the admin account from `ADMIN_EMAIL` + `ADMIN_PASSWORD`

---

## Docker

```bash
docker-compose up --build
```

The `docker-compose.yml` includes the full environment: app server, Core DB, and Ledger DB.

---

## Migration System

Migrations are versioned and tracked in the `migration_history` table. Each migration runs exactly once.

| Version | Description |
|---------|-------------|
| `v1_core_schema` | Initial core database schema |
| `v2_additive_columns` | Idempotent column additions |
| `v3_ledger_schema_v1` | Initial Ledger DB schema |
| `v4_registry_seed` | Database connections registry seeding |
| `v5_orchestrator_cleanup` | Legacy column cleanup |
| `v6_coupon_system_expansion` | Coupon usage tracking |
| `v7_finance_expansion` | Deposit requests + plan history |
| `v8_security_hardening` | Stripe key encryption transition |
| `v9_security_janitor` | Final sweep for unencrypted keys |

---

## Authentication

| Method | Flow |
|--------|------|
| Email / Password | bcryptjs (cost 10) · JWT (7d) · Token Blacklist on logout |
| Google OAuth 2.0 | CSRF-protected state token · Popup or redirect mode |
| Password Reset | Time-limited token (1h) · Deleted immediately on use · Per-email rate limit |

All authenticated requests pass through two checks:
1. Token is not in the `token_blacklist` table
2. User account is not `suspended`

---

## Subscription Plans

| Plan | Monthly | Annual | Target |
|------|---------|--------|--------|
| Starter | Free | Free | New users |
| Pro | $19.99 | $199.90 | Advanced users |
| Elite | $49.99 | $499.90 | Power users |

Plan limits are enforced per-tool, per-day via the `user_usage` table. Limits are defined as JSON in `plans.limits`.

---

## Wallet & Economy

- Users earn **points** via referrals and bonuses
- Points can be converted to **USD balance** at a configurable rate
- USD balance can be used to pay for subscriptions or withdrawn
- All financial operations use `SELECT ... FOR UPDATE` to prevent race conditions
- Economy settings (rates, minimums) are stored in `economy_settings` in the Ledger DB

---

## Referral System

- Multi-level referral tree tracked in `referral_tree`
- Referrer earns a configurable bonus percentage
- Referral activation requires a minimum deposit (configurable)
- Referral status tracked separately in `referrals` table

---

## Security

| Measure | Implementation |
|---------|---------------|
| Rate Limiting | Global (300/15min) · Auth (20/15min) · Chat (30/min) · Forgot Password (5/hour) |
| JWT | Signed with `JWT_SECRET` · Blacklisted on logout |
| Password Hashing | bcryptjs, cost factor 10 |
| Secret Encryption | AES-256-CBC for all API keys and DB credentials |
| CORS | Restricted to `APP_URL` + `CORS_ALLOWED_ORIGINS` in production |
| CSP | Helmet with nonce-based script/style policy |
| SQL Injection | Fully parameterized queries throughout |
| XSS | HTML escaping on all server-rendered content |
| Prompt Injection | Input sanitization on all AI prompts |

---

## Cron Jobs

| Job | Schedule | Action |
|-----|----------|--------|
| System Maintenance | Daily 03:00 | Clean expired tokens, resets, oauth states, old logs. Update expired subscriptions. Reset AI daily budgets. |
| DB Heartbeat | Every 5 minutes | Monitor all registered database connections |
| Subscription Expiry | Daily 03:05 | Notify users 3 days before subscription renewal |

---

## Admin Dashboard

Accessible at `/admin` (requires `role = 'admin'`).

Features:
- User management (view, suspend, update role)
- AI provider configuration (add/update API keys with budget limits)
- Tool orchestrator configuration (model routing + fallbacks)
- Plan management (create/edit plans and limits)
- Email template editor + SMTP configuration
- Broadcast notifications to all users
- Financial overview (wallets, withdrawals, deposits)
- KYC verification queue
- Security alerts log
- Database connection manager (live swap without restart)

---

## Project Structure

```
perplexta/
├── server/
│   ├── config/         # Socket.IO, protocol constants
│   ├── db/             # Pool initialization, migrations, schema
│   ├── middleware/      # Auth, rate limiting, error handler
│   ├── routes/         # Express route handlers
│   ├── services/       # Business logic (AI, wallet, email, quota...)
│   └── utils/          # Crypto, helpers
├── src/
│   ├── components/     # React UI components
│   ├── pages/          # Route-level page components
│   ├── hooks/          # Custom React hooks
│   ├── context/        # Auth, theme, language context
│   └── lib/            # API client, utilities
├── public/             # Static assets
├── uploads/            # User uploaded files
├── docker-compose.yml
└── .env.example
```

---

## Contributing

This is a private project. For issues or questions, contact the repository owner directly.

---

## License

Private — All rights reserved © 2026 PERPLEXTA
