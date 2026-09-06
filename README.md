# 🌌 Viralbook & ViralLinkUp Platform - Enterprise AI & Social Commerce System

[![Architecture: Full-Stack React 19 + Express](https://img.shields.io/badge/Architecture-Full--Stack%20React%2019%20%2B%20Express-emerald?style=flat-square)](https://github.com)
[![Database: Dual-Pool PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20Dual--Pool-blue?style=flat-square)](https://github.com)
[![Social Commerce: Bulletin & Pages Protocol](https://img.shields.io/badge/Protocol-Viralbook%20Commerce-orange?style=flat-square)](https://github.com)
[![Streaming: Socket.io Realtime Pipes](https://img.shields.io/badge/Streaming-Socket.io%20Ready-ff69b4?style=flat-square)](https://github.com)
[![Stability: Verified Stable Build](https://img.shields.io/badge/Stability-100%25%20Verified%20Clean-2ecc71?style=flat-square)](https://github.com)

---

## 📖 Platform Vision & Identity

**Viralbook & ViralLinkUp Platform** is an enterprise-grade full-stack AI execution, social commercial bulletin, and strategic intelligence ecosystem designed and developed for **Professional Elite Technical Analysis & Commercial Engagement**.

* **Primary Architect & Developer:** **Osama Qoneibi** (أسامة قنيبي).
* **Exclusive Commercial Owner:** **Viral Link Up Ltd.** (شركة فيرال لينك اب المحدودة).

The platform unites AI model orchestration, sovereign community feeds (`/viralbook` & `/bulletin`), verified corporate business pages, direct end-to-end customer-to-business messaging, and real-time Socket.io streaming within a pristine, high-contrast user interface governed by native **Tajawal** typography and zero-flicker transitions.

---

## 🏗️ Technical Architecture & System Topography

```
                                [ Client UI - React 19 + Vite ]
                                               │
                                 ( Real-time Socket.io & REST )
                                               │
                                               ▼
                                [ Express Core Engine & Gateway ]
                      ┌────────────────────────┼────────────────────────┐
                      ▼                        ▼                        ▼
          [ Core DB (Operational) ]   [ Ledger DB (The Vault) ] [ GPU Compute Vault ]
          - User Profiles & Auth      - Append-Only Journals  - RunPod / Vision Nodes
          - 10 Relational Bulletin DB - Wallet Balances & Logs- ComfyUI & Image Workers
          - Chat & Memory Engines     - Stripe Webhook Events  - Dedicated Media Models
```

### 🛡️ Dual-Database Transaction Isolation
To uphold strict security and data boundaries:
* **Operational Core Database (`DATABASE_URL`):** Manages user accounts, active sessions, bulletin posts, verified pages, threaded comments, chat histories, memory distillation trees, and system settings.
* **Financial Ledger Database (`LEDGER_DATABASE_URL`):** A strictly isolated, **append-only ledger** ("The Vault") tracking credits, debits, referral rewards, and Stripe subscription events. Direct relational JOINs between the Core and Ledger databases are strictly forbidden to ensure sovereign financial integrity.

---

## 🌐 Clean URLs & Routing Architecture

The platform operates on a clean, slug-friendly routing system with zero legacy query clutter:

| Path / Route | Description | Key Components |
| :--- | :--- | :--- |
| `/viralbook` | Sovereign Primary Social Feed & Community Hub | `BulletinBoardPage.tsx` |
| `/bulletin` | Commercial Bulletin Board & Multi-Format Media Feed | `BulletinBoardPage.tsx` |
| `/bulletin/:ad_id` | Deep-linked direct view for specific posts, ads, or reels | `BulletinBoardPage.tsx` |
| `/bulletin/page/:page_slug` | Verified Business/Corporate Page Directory & Profile | `BusinessPageDetailModal.tsx` |
| `/profile` | Sovereign User Account Center & Verified Badges | `ProfilePage.tsx` |
| `/chat` | AI Execution Workspace & Strategic Intelligence Engine | `ChatPage.tsx` |
| `/settings` | System Preferences, Theme Sync, & Security Controls | `SettingsPage.tsx` |
| `/subscription` | Plan Manager, Credit Top-Ups, & Stripe Checkout | `SubscriptionPage.tsx` |
| `/admin` | Enterprise ERP Command Center & AI Tool Orchestrator | `AdminPanel.tsx` |

All routes utilize automatic catch-all fallbacks to ensure smooth, SPA-friendly navigation without broken links or missing page states.

---

## 🎨 Unified Toast & Global Modal Confirmation System

### 1. Unified Action Confirmation Modal (`ActionConfirmationModal`)
Native browser popups (`alert`, `confirm`, `prompt`) are strictly eradicated across the entire platform. All destructive and sensitive actions (deleting posts, purging memories, updating settings, processing wallet refunds) utilize a unified confirmation modal:
* **Red Action State:** Destructive/deletion actions feature an official, soft red button (`bg-red-500 hover:bg-red-600 text-white`).
* **Crisp Action State:** Confirmation/save actions feature a high-contrast white/accent action button (`bg-white dark:bg-[var(--surface-card)]`).
* **Subtle Cancel:** Transparent, calm cancellation controls (`text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]`).

### 2. Global Floating Toast System (`ServiceUpdateToast`)
Standardized CSS class infrastructure (`.toast-container-floating`, `.toast-floating`, `.toast-progress-track`) handles all live user feedback:
* **Asynchronous Loaders:** Integrated `.loading(message, title)` methods display smooth animated progress indicators for media trimming, post boosting, and file parsing.
* **Auto-Dismiss Progress Bar:** Visual time-remaining track (`.toast-progress-fill`) with smooth linear transitions.
* **Haptic Feedback:** Seamless integration with native haptic engines (`triggerHaptic`) on mobile devices during toast triggers.

---

## 📱 Mobile Safe Area & Header-to-Footer Symmetry

The platform features a floating capsule mobile bottom navigation bar (`.mobile-bottom-nav`) engineered for header-to-footer symmetry:
* **Floating Capsule Island:** Positioned at `bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px))` with side margins (`left: 0.75rem`, `right: 0.75rem`), eliminating screen edge sticking on iOS and Android devices.
* **Symmetric Button Mass:** Nav items (`.mobile-nav-item`) feature `32px` heights, `8px` border radii (`rounded-[8px]`), and `14px` icon sizes, perfectly matching top header action buttons.
* **Active State Indicators:** Micro-dots (`.bg-accent`) smoothly indicate active routes without layout shifting.

---

## 🗄️ Database Schema & Relational Architecture

All bulletin, page, and media operations strictly interface with the Core Database across 10 dedicated relational tables:

1. `bulletin_ads`: Posts, ads, reels, and stories entity (`user_id`, `page_id`, `ad_format`, `audience`, `whatsapp_number`, `is_boosted`, `location_city`, `media_urls`, metrics).
2. `bulletin_pages`: Certified corporate and commercial page entities (`page_slug`, `page_name`, `verification_badge`, contact info).
3. `bulletin_page_followers`: Many-to-many page subscription mappings.
4. `bulletin_page_inquiries`: Commercial customer prospects and lead records.
5. `bulletin_ad_likes`: Authentic user post reactions (Like, Love, Haha, Wow, Sad, Angry).
6. `bulletin_ad_comments`: Nested multi-level threaded discussions.
7. `bulletin_comment_likes`: Granular comment-level reaction records.
8. `bulletin_ad_messages`: Direct encrypted customer-to-business messenger conversations (`AdMessengerHub.tsx`).
9. `bulletin_saved_ads`: User bookmark collections (`bulletin_saved_ads`).
10. `bulletin_reports`: Moderation reports and notification filtering rules.

### 🔌 Isolated GPU Infrastructure Vault
GPU compute nodes, serverless endpoints (RunPod, ComfyUI, dedicated vision nodes), and media processing models are isolated in dedicated relational tables (`gpu_providers` and `gpu_provider_models`), preventing any key pollution or routing confusion with general LLM text APIs.

---

## ⏱️ Server Background Cron Jobs & Maintenance Routines

Background server jobs (`server/jobs/cron.ts`) run automated maintenance loops:

1. **Inactive Account & Memory Consolidation Job (`consolidateAllUserMemories`)**:
   - Compresses legacy memory trees for inactive profiles month-by-month, distilling oldest records into high-density summaries to optimize context limits.
2. **Ephemeral Story Cleanup Routine (`cleanupExpiredStories`)**:
   - Automatically purges bulletin stories older than 24 hours, ensuring optimal database storage and performance.
3. **Ad Expiry & Wallet Refund Audit (`auditExpiredBoostedAds`)**:
   - Audits active boosted posts against duration thresholds (`bulletin_ad_daily_price`). Handles automated wallet refunds or debit adjustments upon post rejection or completion.
4. **Daily Ledger & Wallet Audit**:
   - Verifies ledger consistency, checks append-only transaction logs, and prevents negative balance drifts.

---

## 🚀 Setup & Deployment Documentation

### Prerequisites
* **Node.js:** v18, v20, or higher with TypeScript support.
* **PostgreSQL Database:** Twin accessible operational (`Core`) and transactional (`Ledger`) database instances.

### 1. Environment Configuration
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```
Populate environment variables inside `.env`:
```env
# Database Connections
DATABASE_URL=postgres://user:password@127.0.0.1:5432/perplexta_core
LEDGER_DATABASE_URL=postgres://user:password@127.0.0.1:5432/perplexta_ledger

# Security & Session Keys
JWT_SECRET=your_secure_session_secret_key
ENCRYPTION_KEY=32_character_aes_encryption_key_here

# Provider Keys (Managed via dynamic API Key Vault)
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Development Execution
```bash
# Install dependencies
npm install

# Launch Vite + Express TypeScript server in development mode
npm run dev
```

### 3. Production Build & Deployment
The build process bundles backend TypeScript sources into a standalone CJS bundle (`dist/server.cjs`) using `esbuild` for zero runtime module resolution issues in containerized environments (Google Cloud Run, AWS ECS, Docker):
```bash
# Compile client assets and bundle backend server
npm run build

# Start production server
npm run start
```

---

## 🔒 License & Brand Ownership

### **STRICTLY PROPRIETARY - ALL RIGHTS RESERVED**

This platform, its source code, relational databases, structural schema mappings, visual layouts, responsive CSS assets, API protocols, and integration structures are completely proprietary, highly confidential, and protected under international intellectual property and copyright laws.

* **Primary Architect & Developer:** **Osama Qoneibi** (أسامة قنيبي).
* **Exclusive Commercial Owner:** **Viral Link Up Ltd.** (شركة فيرال لينك اب المحدودة).

Unauthorized duplication, cloning, decompilation, reverse engineering, or redistribution of any part of this system without prior written authorization is strictly prohibited and will incur immediate legal prosecution.

---

<div align="center">
  <sub>VIRALBOOK & VIRALLINKUP PLATFORM • Engineered with Professional Purity, Majestic Symmetry & Uncompromising Performance.</sub>
  <br>
  <sub>Copyright © 2026 Osama Qoneibi & Viral Link Up Ltd. All Rights Reserved.</sub>
</div>
