# 🌌 Perplexta Platform - Elite AI System & Dual-Database Orchestrator

[![Architecture: Full-Stack React 19 + Express](https://img.shields.io/badge/Architecture-Full--Stack%20React%2019%20%2B%20Express-emerald?style=flat-square)](https://github.com)
[![Database: PostgreSQL Dynamic Quad-Pool](https://img.shields.io/badge/Database-PostgreSQL%20Quad--Pool-blue?style=flat-square)](https://github.com)
[![Protocol: Agentic Commerce Protocol](https://img.shields.io/badge/Protocol-ACP%20Discovery-orange?style=flat-square)](https://github.com)
[![Protocol: Model Context Protocol](https://img.shields.io/badge/Protocol-MCP%20Integration-0052cc?style=flat-square)](https://github.com)
[![Streaming: Socket.io Realtime Pipes](https://img.shields.io/badge/Streaming-Socket.io%20Ready-ff69b4?style=flat-square)](https://github.com)
[![Stability: Verified Stable](https://img.shields.io/badge/Stability-Verified%20Stable-2ecc71?style=flat-square)](https://github.com)

---

## 📖 Platform Vision & Identity

**Perplexta Platform** is an enterprise-grade full-stack AI execution, programmatic workspace, and financial ledger platform engineered for **Professional Elite Technical Analysis**. Underpinned by modular full-stack interfaces and a robust dual-database infrastructure, Perplexta coordinates real-time AI tool-stream pipes, silent multi-model failover routes, large physical file intelligence extraction, and strict balance ledger auditing.

The visual interface is highly structured around a premier, high-contrast aesthetic. It features responsive, eye-safe twilight modes, the signature **Emerald Glow** active indicator state, elegant Arabic-English integration governed by the native **Tajawal** typography, and zero-flicker transitions.

---

## 🏗️ Technical Architecture & System Topography

```
                                    [ Client UI - React 19 + Vite ]
                                                   │
                                     ( Real-time Socket.io & REST )
                                                   │
                                                   ▼
                                    [ Express Core Engine & Gateway ]
                           ┌───────────────────────┼───────────────────────┐
                           ▼                       ▼                       ▼
               [ Core DB (Operational) ]  [ Ledger DB (The Vault) ] [ External Ecosystem ]
               - User Profiles & Sessions - Append-Only Transactions - Moderated Forums
               - Orchestrator Schemas     - Partner Referral Trees   - Partner Tech Blogs
               - Secure 100MB Sandbox     - Stripe Subscriptions     - Assets Marketplace
```

### 🛡️ Dual-DB Transaction Isolation Protocols
To establish defense-in-depth data boundaries:
* **Operational Core Pool (`DATABASE_URL`):** Coordinates transient contexts, dynamic system configurations, authentication schemas, chat logs, and workspace sessions.
* **Financial Ledger Pool (`LEDGER_DATABASE_URL`):** An isolated, **strictly append-only registry** ("The Vault") tracking credits, debits, referral allocations, and Stripe webhook events. Query-level relational JOINs between these pools are strictly banned to enforce sovereign financial security.

---

## 🧠 Core Systems & Advanced Platform Pillars

### 1. Real-Time Task Progress WebSocket Streaming Interface
Perplexta provides clear execution transparency during complex, high-latency tasks (e.g., dynamic AI image synthesis and Google Veo video task compilation). Rather than exposing raw system details, the platform broadcasts elegant, structured progress telemetry over Socket.io:
* **Workflow Signaling:** The execution loop registers immediate progress logs at core milestones:
  * **10% (Analyzing / `analyzing`)**: Preparing aesthetic model paths and checking parameters.
  * **35% (Validating / `validating`)**: Securing token authorizations and checking wallet balances.
  * **55% (Synthesizing / `synthesizing`)**: Handshaking with remote AI model endpoints (e.g., Replicate, Google APIs).
  * **55% to 95% (Processing / `processing`)**: Active multi-step pixel rendering streaming loop.
  * **100% (Completed / `completed`)**: Generating high-fidelity visual assets, performing disk syncs, and mapping metadata.
* **Bilingual Integration:** Events emitted onto user rooms (`user_${userId}`) carry synchronized, localized strings in both Arabic and English:
  ```json
  {
    "progress": 55,
    "status": "synthesizing",
    "status_ar": "طلب ترخيص الإنشاء من المزود وتوليد مصفوفة البيكسلات...",
    "status_en": "Requesting synthesis authorization from Provider & launching pixel generation..."
  }
  ```
* **Frontend Responsiveness:** The UI intercepts the `image_progress` and `video_progress` sockets inside the `ChatPage` lifecycle to update interactive loaders on the exact executing block, giving users clean, immediate visual progress bars.

### 2. Perplexta Memory Distillation & Saturation Controls
To optimize context limits while preserving historical continuity, the system contains an automated AI Memory Distillation Engine:
* **Dual Threshold Limits:** 
  * **Proactive Warning (45 records)**: Triggers an warning alert informing the interface of rising context limits.
  * **Auto-Consolidation (50 records)**: Instantly compiles the 10 oldest discrete factual records, distilling them via background intelligence into a single, high-density conceptual summary, purging legacy noise.
* **Transparency Protocol:** Eradicates "silent contextual ingestion" by sending custom `memory_extracted` and `memory_consolidation` events, visually rendering confirmation notices in the chat workspace.
* **Cron Optimization (`consolidateAllUserMemories`)**: Periodically compresses memory trees for inactive profiles month-by-month as a server maintenance routine.

### 3. Rigid Quota Enforcer & Subscription Security
* **Granular Tool-Specific Quotas:** Shuns generic global restrictions. System admins design discrete daily and monthly authorization barriers for each workspace tool separately (e.g., *Canvas Studio*, *Sovereign Research*, *Perplexta Analysis*) via the command dashboard.
* **High-Conversion Blocking Card:** When a client exceeds their designated allowance, the orchestrator blocks execution and serves a localized, elegant bilingual "Quota Exceeded" banner. It suggests immediate pathways to subscription tier upgrades or friend referral links.
* **Resilient Webhook Handlers:** Seamlessly process complex Stripe lifecycle events (`customer.subscription.deleted`, `invoice.payment_failed`) to synchronize structural account states instantly while auto-dispatching system push notifications.

### 4. RLHF Quality Tracking System
* **Fine-tuning Analytics:** Allows clients to dispatch immediate ratings ("Thumbs Up" / "Thumbs Down") directly to the database.
* **Database Mapping:** Assistant messages stream down alongside their unique database IDs. Clicking feedback prompts immediate, error-free database writes against the `feedback` schema in Core DB, mapping human quality metrics to explicit model runs.

### 5. Secure 100MB File Sandbox Ingestion & PDF Bridge
* **Strict Allowlist Filtering:** Files uploaded to the localized volume go through heavy backend verification, enforcing strict size checks (100MB MAX limit), filename path-traversal sanitization, and type checking.
* **PDF Analytical Bridge:** Deploys resilient on-the-fly text extraction pipelines to handle multi-version PDF files. Extracted text contexts are injected dynamically into the active Orchestrator runtime prompt parameters.

### 6. Production Cache Optimizations & Zero-Database File Version serving
To address latency issues and ensure rapid page-loading on high-traffic servers:
* **High-Performance Version Caching (`fileVersionCache`):** Introduced a specialized, in-memory caching system for file versions to eliminate redundant query executions.
* **Intelligent DB-Bypass logic:** When serving static assets, logos, and public site illustrations (which are not user-uploaded files), the server immediately bypasses the `user_files` database lookup entirely.
* **Reactive Cache Invalidation:** The native file-system watcher (`fs.watch`) monitors the uploads directory and automatically flushes both the permissions cache (`filePermissionCache`) and the version cache (`fileVersionCache`) whenever files are modified, replaced, or physically erased, maintaining high performance with zero-lag consistency.

---

## 🧼 Production Purging & Code Alignment Updates (August 31, 2026)

To prepare the platform for enterprise-grade containerized deployment and achieve a flawless 100% build pass:

### 1. UI/UX Purge & Premium Golden Locks System
* **Removal of Unsolicited Upgrade Prompt Modal:** Completely deleted `/src/components/UpgradePromptModal.tsx` and purged its imports and declarations from `src/App.tsx` to cleanse the project of intrusive promotional elements.
* **Zero-Prompt Locked Interactivity:** Refactored the interactions for locked advanced tools and AI models in `/src/pages/ChatPage.tsx` to remain passive upon clicking, eliminating noisy pop-up alerts.
* **Elite Amber/Golden Locks:** Upgraded locked advanced tools and models to feature a premium, high-contrast Amber/Golden padlock (`text-amber-500`) for clear, elegant visual guidance without unsolicited popups.

### 2. File Clean-up & Zero-Clutter Compliance
Purged all temporary testing scripts, database patches, and transitional configuration files to keep the production root directory strictly pristine:
* Deleted temporary test scripts: `test.js`, `test-plans.js`, `test-test.ts`, `test-db.js`, `test-db.ts`, and `test-insert.js`.
* Cleared repair, patch, and transition scripts: `fix-db.js`, `fix-db2.js`, `fix-db-plans.js`, `move_effect.cjs`, and `patch_reels_start_id.sh`.
* Removed draft documents and local legacy guides: `auth.md`.

### 2. Full-Stack Type Alignment & Bug Fixes
* **Dynamic Socket.io Loading Bridge:** Transitioned the core `createNotification` service from static `io` imports to dynamic execution imports (`await import('../config/socket.js')`). This completely resolves potential ESM uninitialized import states during initial system boots on production servers.
* **Universal Async Loading Indicators:** Integrated a native `.loading(message, title, options)` method directly into the `NotificationContext` type and custom `toast` helpers. This ensures that operations across the Ads Management, Video Trimming, and Wallet panels can easily trigger and control state loaders.
* **Optional Description Parsing:** Added support for the `description` field directly into `NotificationOptions` and `NotificationItem` to accept custom metadata payloads seamlessly, resolving strict type checks on multiple components.
* **Strict Schema Castings:** Fixed numerical limit assignment within the `PlansSubscriptionsView` admin component, correcting strict typing for quota configurations (supporting numbers, booleans, and `"unlimited"` tokens cleanly).

---

## 🤖 Programmative AI Agent Capability Discovery Specifications

To support machine clients, developer automation script networks, and autonomous AI nodes, the Perplexta Platform exposes rich programmatic discovery descriptors:

```
        [ Agentic client Node ] ──────── 1. Read Link Headers ────────► [ Domain Root (/) ]
                  │                                                              │
                  │◄─────── 2. RFC 9727 / RFC 8288 Discovery Links ──────────────┘
                  │
                  ├──────── 3. Map MCP Capabilities ─────────────────────────► [ /.well-known/mcp/server-card.json ]
                  ├──────── 4. Read Commerce Specifications ─────────────────► [ /.well-known/acp.json ]
                  └──────── 5. Automated Agent Registry & Ledger x402 ──────► [ /api/auth/register-agent ]
```

### 🪐 1. Agentic Commerce Protocol (ACP)
* **API Specification URL:** `/.well-known/acp.json` (Public, optimized CORS, direct browser-less fetching).
* **RFC Navigation Headers:** The host automatically responds to index requests targeting `/` or `/index.html` with reactive compliance headers:
  ```http
  Link: </.well-known/api-catalog>; rel="api-catalog", </.well-known/mcp/server-card.json>; rel="service-desc", </.well-known/acp.json>; rel="acp"
  ```
* **Discovery Schema:** Enforces automated standard handshakes:
  ```json
  {
    "protocol": { "name": "acp", "version": "1.0" },
    "api_base_url": "https://your-perplexta-instance/api",
    "transports": ["http"],
    "capabilities": { "services": ["checkout"] }
  }
  ```

### 🛰️ 2. Model Context Protocol (MCP) Host Integration
* **Service Card Catalog:** Exposed dynamically at `/.well-known/mcp/server-card.json`.
* **Standard Schemas:** Provides programmatic developer agents immediate structural mappings of available analysis utilities, required arguments, pricing limits, and streaming paths.

### ⚡ 3. Automated x402 Payment Handshake Protocol
* **Automated Agent Registry:** Registration queries and dynamic keys generation map directly to standard financial databases and wallet balance entries.
* **Balance Verification:** Verification protocols query administrative pricing matrices for `x402_api` triggers, checking balances against a standard audited fee of **₪5.00** per integration.
* **Sovereign Quota Control:** If wallet credits fail to cover the cost, the backend instantly blocks credential allocations with a standardized **HTTP 402 Insufficient Funds** state:
  ```json
  {
    "error": "Insufficient Balance",
    "message": "Dynamic key creation requires ₪5.00. Please recharge your account balance."
  }
  ```

---

## ⚙️ Development, Build, & Server Initialization

### Standard Local Prerequisites
* **Node.js:** v18, v20, or higher with typescript support.
* **PostgreSQL Database:** Twin accessible operational and transactional ledger instances.

### 1. Environment Setup
Create folder environment variables:
```bash
cp .env.example .env
```
Populate keys securely inside `.env` (Never commit credentials to repo):
```env
# Database Credentials
DATABASE_URL=postgres://user:password@127.0.0.1:5432/perplexta_core
LEDGER_DATABASE_URL=postgres://user:password@127.0.0.1:5432/perplexta_ledger

# Execution Security & Signing Block
JWT_SECRET=your_hyper_secure_session_token_key
ENCRYPTION_KEY=32_character_aes_encryption_key_here

# Provider Integration Keys (Managed via dynamic API Key Vault)
GEMINI_API_KEY=your_gemini_api_key_for_backend_orchestration
```
*(All administrative keys are saved to disk with AES-256 standard encryption, using your specific `ENCRYPTION_KEY` block.)*

### 2. Startup & Node Scripts
```bash
# Install core dependencies safely
npm install

# Launch Vite + Express TypeScript Server in local Dev Mode
npm run dev
```

### 3. Standalone Production Bundler
Perplexta uses `esbuild` configurations to bundle physical backend sources into a clean, standalone, type-stripped CJS artifact to eliminate runtime Module resolution errors in containerized clouds (e.g., Google Cloud Run):
```bash
# Build & Bundle assets 
npm run build

# Start stand-alone bundled server
npm run start
```

---

## 🔒 License, Proprietary Constraints & Brand Ownership

### **STRICTLY PROPRIETARY - ALL RIGHTS RESERVED**

This application, its source code, relational databases, structural schema mapping, visual layouts, responsive CSS assets, programmatic API protocols, and integration structures are completely proprietary, highly confidential, and protected under local and international intellectual property (IP), commercial trade, and copyright laws.

* **Primary Architect & Developer:** **Osama Qoneibi** (أسامة قنيبي).
* **Exclusive Commercial Owner:** **Viral Link Up Ltd.** (شركة فيرال لينك اب المحدودة).

#### **Binding Terms & Restrictive Covenants:**
1. **Reverse Engineering Prohibition:** Decompiling, extracting, or attempts to decode structural backend execution states, encryption schemas, or routing protocols is strictly prohibited.
2. **Duplication & Redistribution Prohibitions:** No part of this repository, code structure, or interface design can be duplicated, cloned, published, altered, or shared without prior written consent from both OSAMA QONEIBI and VIRAL LINK UP LTD.
3. **Legal Compliance Tracking:** Unauthorized access, reverse-engineering attempts, or duplication of copyright elements will initiate swift, aggressive commercial and intellectual property prosecution across international courts of justice.

---

<div align="center">
  <sub>PERPLEXTA PLATFORM • Engineered with Professional Purity, Majestic Calm & Bulletproof Performance.</sub>
  <br>
  <sub>Copyright © 2026 Osama Qoneibi & Viral Link Up Ltd. All Rights Reserved.</sub>
</div>
