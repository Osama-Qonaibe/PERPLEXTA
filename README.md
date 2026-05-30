# 🌌 Perplexta Platform - Elite AI System & Dual-Database Orchestrator

[![Architecture: Full-Stack React + Express](https://img.shields.io/badge/Architecture-Full--Stack%20React%20%2B%20Express-emerald?style=flat-back-line)](https://github.com)
[![Database: PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_Dual--Core-blue?style=flat-back-line)](https://github.com)
[![Styling: Tailwind CSS v4](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-8e44ad?style=flat-back-line)](https://github.com)
[![Stability: Verified Active](https://img.shields.io/badge/Stability-Verified%20Active-2ecc71?style=flat-back-line)](https://github.com)

---

## 📖 نظرة عامة | Platform Vision
**Perplexta Platform** is an enterprise-grade AI execution, workflow, and financial ledger platform designed for **Professional Elite Technical Analysis**. It leverages modern full-stack architectures to provide real-time streaming AI interactions with robust failover routing, modular sub-service orchestration, secure 100MB file intelligence abstraction, and a completely segregated financial transaction ledger.

تعد **منصة بيربليكستا** نظامًا متكاملًا على مستوى المؤسسات لإدارة تدفق العمل الذكاء الاصطناعي والدفتر المالي ذي المصداقية العالية. تم تصميمها خصيصًا لتقديم **التحليلات التقنية الاحترافية المتقدمة** بدقة فائقة وبنية تحتية مرنة تواجه عثرات الاتصال والخدمات بشكل تلقائي وذاتي (Silent Failover).

---

## 🏗️ البنية السحابية والهندسة التحتية | System Architecture

```
                                  [ Client UI - React 19 ]
                                             │
                                   ( Socket.io & REST )
                                             │
                                             ▼
                             [ Express API & Security Gateway ]
                                  │                     │
                                  ▼                     ▼
                     [ Core DB (Operational) ]   [ Ledger DB (The Vault) ]
                     - Profiles & Auths          - Append-Only Wallets
                     - Tools & Orchestration     - Referral Tree
                     - Chats & Real-time Logs    - Payout Transactions
```

### 1. نظام قواعد البيانات الثنائي | Dual-Database Architecture
For absolute integrity and maximum protection of core assets:
*   **Operational Core Database:** Manages user identity, session management, historical conversations, AI activity auditing, and customizable interface presets.
*   **The Ledger Database (The Vault):** A strictly isolated environment written using an **Append-Only ledger methodology**. Direct alteration or erasure of user balances is physically impossible. Every balance change relies on dynamic Debit/Credit records verified by secure server-side isolation layers with cross-pool synchronization.

### 2. محرك التوجيه الذاتي الصامت | Silent Failover Orchestrator
Eradicating API downtimes completely:
*   Any premium tool (Code Analysis, Intelligent Audio Studio, Research Agent, etc.) is configured with a **Primary Model**, **Fallback 1 Model**, and **Fallback 2 Model**.
*   If the primary model rate-limits, errors out, or fails pre-flight verification, the routing engine silently swaps connection pools to fallback models in less than 40ms, offering a completely uninterrupted user experience without hardcoded configurations.
*   **Rigorous Safe-Swap Validation:** Swapping pools in production runs full SQL ping checks across all 4 database endpoints (`Core`, `Ledger`, `External`, `Security`) sequentially to ensure no database state mismatch can affect ongoing streaming cycles.

### 3. الحاوية الآمنة لملفات الذاكرة الاستخباراتية | Secure Ingestion & Intel Extraction
*   **Capacity Boundary:** Secure processing and analytics of files up to **100MB** using sandboxed storage.
*   **Extraction Bridge:** High-precision parsing modules targeting PDFs, Rich Text Documents, Spreadsheets, and HTML structures. Extracted text context is automatically structured and fed dynamically into advanced reasoning pipelines for deep intelligence analysis.
*   **Zero-Knowledge Keys:** API keys and credential databases are stored using AES-256 hardware-grade standard cryptography with zero memory leaks.

---

## ⚙️ الميزات الأساسية | Key Features

*   **Majestic Motion & Aesthetics:** Built using Tailwind CSS v4 with unified **600ms to 1.1s majestic slow-motion eases**, custom-designed dark-mode body canvases (`bg-[#0f0f11]`), and signature **Emerald Glow drop-shadow filters** for active interactable elements.
*   **Bilingual Synchronization (AR/EN):** Fully integrated internationalization mapping across high-performance views, reports, system logs, subscription toggles, and email templates.
*   **Granular Quota Control:** Dynamic, tool-by-tool daily and monthly quota enforcement. Includes a beautifully designed bilingual "Quota Exceeded" layout that acts as a lead converter to upgrade plans or refer colleagues.
*   **Real-time Heartbeats & Log Tracking:** Socket.io driven metadata streaming, real-time activity stream panels on the Admin Console, and automated 24-hour maintenance cycles managed via internal CRON engines.

---

## 🛠️ دليل التثبيت والتشغيل المحلي | Setup & Local Installation

### Prerequisites
*   Node.js (v18 or higher recommended)
*   PostgreSQL Instances (for Core and Ledger)

### 1. استنساخ المستودع وضبط البيئة | Clone & Setup Environment
Clone this repository locally, then create a `.env` file referencing `.env.example`:

```bash
cp .env.example .env
```

Ensure you configure the following core variables:
```env
DATABASE_URL=postgres://user:password@localhost:5432/perplexta_core
LEDGER_DATABASE_URL=postgres://user:password@localhost:5432/perplexta_ledger
JWT_SECRET=your_jwt_signing_secret_here
ENCRYPTION_KEY=32_character_aes_encryption_key_here
```

*(Note: AI Provider API keys such as Gemini and OpenAI are strictly database-driven and dynamically loaded via the encrypted API Keys Vault, avoiding any static local configurations or hardcoded models.)*

### 2. تثبيت الحزم البرمجية | Install Dependencies
```bash
npm install
```

### 3. تشغيل خادم التطوير الصاخب | Run Development Environment
To trigger the concurrent Express routing backend and the Vite frontend server with live monitoring:
```bash
npm run dev
```

### 4. البناء للإنتاج والتشغيل المستقر | Production Build & Run
To compile the absolute, optimized bundles into a single self-contained CJS bundle for Cloud native environments:
```bash
# Build Frontend assets and bundle full server modules
npm run build

# Start the optimized node process
npm run start
```

---

## 🛡️ ميثاق الأمان والاستقرار التقني | Security & Resiliency Integrity
To maintain corporate security and bulletproof resistance against exploits:
*   **SSRF Phishing Guards:** Strict hostname and whitelist parsing prevents malicious remote callback triggers or internal loopback lookups across external schemas.
*   **Database Sync Protection:** Migrations undergo asynchronous dry-runs with high-performance error handling, guaranteeing a Degradation Mode fallback over fatal startup failures if remote connections timeout.
*   **Raw Trace Purging:** All raw database traces and query diagnostics are strictly blocked from client exposures, piping debugging dumps cleanly into secure file system volumes.

---

<div align="center">
  <sub>PERPLEXTA PLATFORM. Engineered with Architectural Purity & Visual Majesty.</sub>
</div>
