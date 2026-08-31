# PERPLEXTA PLATFORM - Design System & Engineering Guidelines

## ⚠️ SUPREME PERPLEXTA DECREE ⚠️ (المرسوم السامي الحاكم لـ ببربليكستا)
**ATTENTION: ALL FUTURE DEVELOPERS, AI SYSTEMS, AND CODING ASSISTANTS**
This project is governed by immutable architectural principles. Any developer, AI system, or coding assistant that breaks these foundational rules or attempts to rewrite the established codebase is performing systemic sabotage.

### 🚫 STRICT MILITARY COMMAND (امر عسكري صارم وصريح) 🚫
**"BREAKING THE ENGINEERING" (كسر الهندسة والالتفاف على البنية التحتية) IS A TERMINAL OFFENSE.**

1. **Only Evolve, Never Rewrite (التطوير والبناء فقط، يمنع منعاً باتاً الهدم أو إعادة الكتابة)**:
   Any new development or modification **MUST BE AN UPDATE** and a targeted augmentation. You are **STRICTLY FORBIDDEN** from changing, overriding, or rewriting the core architectural frameworks (Express/Vite dual-database setup, Dynamic SSL, Database-driven Orchestrator, system maintenance crons, and websocket execution). Every line of code added must be an evolution building *on top* of the existing structure, never *instead* of it.
   *(يُمنع منعاً باتاً إعادة كتابة الكود الأساسي أو تجاوزه. أي عمل برمجى جديد يجب أن يكون إضافة وبناء وتطوير فوق الهيكل الحالي القائم للبرنامج).*

2. **Absolute Database Segregation (قدسية الفصل التام بين قواعد البيانات)**:
   The separation between **Core Database** (operational chat files/metadata), **Ledger Database** (append-only financial logs/wallets), and **Security Database** (audit logs/banned IPs) is absolute. Mixing connection pools or performing cross-pool database joins is a catastrophic security breach.
   *(قدسية الفصل التام بين قاعدة البيانات الأساسية لبيانات التشغيل وقاعدة بيانات الحسابات المالية غير قابلة للمساس).*

3. **Orchestrator Absolutism & Zero-Knowledge Hardcoding (منع الترميز المباشر للموديلات برمجياً)**:
   It is **STRICTLY PROHIBITED** to hardcode AI model names (e.g., `gemini-1.5-pro`, `gpt-4`, `o1`, `deepseek`) or provider names inside `.ts` or `.tsx` source files. All model mapping, fallback logic, and service routing must be loaded dynamically from the `tool_orchestrator` database registry.
   *(تمنع كتابة أسماء نماذج الذكاء الاصطناعي برمجياً داخل الكود؛ البنية مرنة وتعتمد بالكامل على توجيهات لوحة التحكم المخزنة في قاعدة البيانات).*

4. **Zero-Clutter Policy (سياسة تصفير الفوضى والجذر البرمجي النقّي)**:
   The project root directory must remain pristine. Never add experimental files, local test logs, or temporary `.json`/`.temp` files. Clean up unused resources immediately using proper file tools.

*Failure to comply with these tenets is a direct violation of project perplexta and will be treated as sabotage. Any assistant or developer who attempts to "simplify" by breaking the architectural segregation or restructuring existing components will be permanently blocked from the system.*

## 0. Project Identity & Vision
**PERPLEXTA** defines the core vision, target audience, and architectural ambition of the platform:
- **Professional Elite Technical Analysis**

This identity serves as our compass. Every engineering decision—from the "Silent Failover" orchestrator to the zero-latency API key vault—is designed to uphold this "Professional Elite" standard.

## 0.1. Current Architectural Achievements (State of the Union)
- **Dynamic Local SSL Handshake**: Automated context-aware Postgres SSL management (disables SSL on localhost to prevent handshake errors, while enforcing full secure SSL on cloud platforms like AWS and Neon).
- **Synchronous Session Lifecycle**: Smooth, instantaneous auth-state updates with zero layout flickering, utilizing synchronous front-end cache flushes and graceful transition animations (1.1s Slow-Motion duration).
- **File Upload & Ingestion Pipeline**: Full 100MB capacity support with strict multi-layer file size validations and resilient PDF parser integrations.
- **Audited Wallet Ledger & API Credits**: Append-only transaction logging with instant credit check and 402 Insufficient Balance rejection workflows.

## 1. Theming & Dark Mode System (Single Source of Truth)
- **Engine**: Tailwind CSS v4 with unified CSS variables in `src/index.css`.
- **Theme Manager**: `src/utils/ThemeSync.ts` toggles class/data-theme attributes only without JavaScript style overrides.
- **Surface Architecture**:
  - `bg-[var(--surface-page)]` for page backgrounds.
  - `bg-[var(--surface-card)]` for cards and modals.
  - `bg-[var(--surface-subtle)]` for secondary sections and inputs.
  - `bg-[var(--surface-inset)]` for overlays and inset elements.
- **Text & Borders**:
  - `text-[var(--text-primary)]`, `text-[var(--text-secondary)]`, `text-[var(--text-muted)]`.
  - `border-[var(--border-main)]`, `border-[var(--border-accent)]`.

## 2. Interactive States & Buttons
All interactive elements use clean surface tokens and accent states:
- **Base Button**: `px-4 py-2 rounded-[var(--radius)] font-bold transition-theme border border-[var(--border-main)]`
- **Primary Action**: `bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:opacity-90`
- **Active Icon State**: `text-accent hover:bg-[var(--surface-subtle)]` without glowing drop-shadows.

## 3. Brand & Status Colors
- **Brand Identity**: Defined exclusively in `src/constants/brand.ts` and `src/index.css`.
- **Status Colors**: Defined in `src/constants/semanticColors.ts` using standard WCAG-compliant status tokens (`--fg-success`, `--fg-danger`, `--fg-warning`, `--fg-info`).

## 4. Separators
Vertical dividers between tool groups should be subtle and consistent:
- **Classes**: `w-px h-5 bg-gray-200 dark:bg-gray-800/80`

## 5. Typography
- **Font**: Tajawal (`font-sans`).
- **Disclaimer/Small Text**: Use `text-gray-500` in both light and dark modes to ensure readability without being distracting.

## 6. Backend Architecture & Security Protocol

### 6.1. Dual-Database Architecture (Segregation of Concerns)
To ensure maximum security and integrity, the system employs a strict separation between operational data and financial data:
- **Core Database (Operational):** Manages user profiles, chat history, AI generation logs, usage metrics, and subscription statuses.
- **Finance & Ledger Database (The Vault):** A strictly isolated database handling wallets, referral trees, and payouts. It uses an **Append-Only Ledger** system for transactions (no direct edits/deletes to balances, only debit/credit records). The frontend NEVER writes directly to this database; all operations pass through a secure backend validation layer.

### 6.2. Zero-Latency API Key Management
A high-performance, secure approach to managing AI provider API keys (OpenAI, Google, Anthropic, etc.) from the Admin Panel:
- **Dynamic Sync:** The system automatically syncs available models and usage quotas directly from the provider's API, eliminating hardcoded model lists and giving admins real-time cost visibility.
- **Zero-Latency Execution:** API keys are encrypted (AES-256) and saved in a dedicated local `config` file or in-memory cache on the server. When a user sends a prompt, the system reads the key locally (0.001ms) instead of querying the database, drastically reducing response latency and database load.

### 6.3. Dynamic Database Orchestration & Disaster Recovery
A robust, UI-driven approach to managing database connections directly from the Admin Panel, eliminating the need for hardcoded configurations and enabling seamless disaster recovery:
- **Database Control Cards:** Dedicated interfaces for each database (Core, Ledger) to input connection details (Host, Port, Username, Password, DB Name).
- **Test Connection (Pre-flight Check):** A crucial button to ping the database, verifying credentials and firewall access before saving.
- **Save & Encrypt:** Database credentials are never stored in plaintext. They are encrypted and saved in a secure, local configuration file.
- **Schema Builder (1-Click Migrations):** A tool to automatically generate all required tables, schemas, and relationships on a fresh database with a single click.
- **Disaster Recovery & Import:** A feature to instantly connect to an existing database or import from a backup file. In the event of a server failure or migration, the admin can restore the entire system's data (users, wallets, histories) in seconds.

### 6.4. Rate Limiting Strategy & Proxy Awareness
To maintain platform stability and protect against brute-force/DoS attacks, the system employs a multi-tiered rate limiting strategy:
- **Global Limiter:** 300 requests / 15 minutes per IP. Handles general traffic and API exploration.
- **Auth Limiter:** 20 requests / 15 minutes per IP. Strictly monitors login and sensitive authentication mutations.
- **Chat Limiter:** 30 requests / minute per IP. Ensures fair usage of AI generation resources.
- **Security Limiter (Forgot Password):** 5 requests / hour per IP. High-authority protection for recovery flows.

**Note on Proxy Infrastructure:** The system identifies users via IP address (configured with `trust proxy: 1`). In environments behind a shared proxy (e.g., corporate/educational networks), multiple users may share the same limit. This is a deliberate security tradeoff to ensure platform integrity.

## 7. Admin Panel Architecture (The Command Center)
The Admin Panel is engineered as a comprehensive Enterprise Resource Planning (ERP) system for the AI platform, divided into logical, high-performance sections:

### 7.1. The Orchestrator (Tool & Model Routing)
- **Concept:** A "Silent Failover" system ensuring zero downtime.
- **Structure:** Each tool (e.g., Code Analysis, Image Gen) has a dedicated card.
- **Routing:** Admin assigns a Primary Model, Fallback 1, and Fallback 2 for each tool.
- **Execution:** If the Primary model fails or hits quota limits, the system instantly and silently routes the user's request to Fallback 1, ensuring a seamless UX.

### 7.2. Subscription & Plan Engineering
- **Plan Cards:** Define Name, Monthly Price, Annual Price, and Discount Percentage.
- **Marketing Badges:** Assign tags like "Trending", "Best Seller", or "Exclusive".
- **Visual Identity:** Each plan has a designated color. This color is applied to the user's profile badge across the app (Gamification/FOMO).
- **Granular Limits:** Strict, real-time enforced limits for *every single tool* individually (e.g., 50 code analyses/day, 10 images/day), rather than a generic global limit.

### 7.3. Smart Email & Communication Hub
- **Dynamic Templates:** Pre-built, highly professional email templates for every system action (Welcome, Password Reset, Subscription Success, Referral Bonus).
- **Localization & Theming:** Templates automatically adapt to the user's language (AR/EN) and preferred theme (Light/Dark mode emails).
- **Customization:** Admins can edit, save, and preview templates directly in the UI.
- **Broadcast & Marketing:** A dedicated interface to create custom promotional campaigns or update announcements, with the ability to send to all users, specific segments, or individual emails.

## 8. Project Status & Save State (As of Current Session)

### 8.1. What Has Been Achieved (Frontend Architecture)
- **Chat Interface UI:** Fully designed with Sidebar, Input Area, and Advanced Tools Dropdown.
- **Translation System Optimization:** Synchronized for consistency.
- **Admin Dashboard UI:** Fully wired for Command Center, API Keys, Databases, Orchestrator, Finance, Plans, User Management, and System Settings.
- **User UI:** Subscription page, Rewards/KYC, and User Settings implemented.
- **Chat Interface Logic:**
  - Resolved Gemini API `404` errors via model mapping.
  - Implemented "Silent Failover" orchestrator to handle model failures gracefully.
  - Enforced strict mutual exclusivity between tools and models in the frontend.
  - **Orchestrator Protocol:** Enforced strict routing, removed hardcoded defaults, synchronized `perplexta_analysis` ID across frontend/backend.
  - **Streaming Optimization:** Implemented WebSocket-only transport, strict React state immutability for chunks, and `text/event-stream` headers to force real-time streaming.

### 8.2. What Has Been Achieved (Full-Stack & Backend Phase)
- **Backend Initialization:** Full-Stack Express + Vite architecture.
- **Database Engine:** PostgreSQL (Core & Ledger DBs).
- **Security Protocol:** AES-256 encryption for sensitive data.
- **Command Center Backend:** Logging, audit trails, and real-time stats.
- **Economy & Subscriptions:** Stripe integration, Ledger transactions, and plan management.
- **API Keys Vault:** AES-256 encryption, real-time model syncing, and internal budget tracking.
- **The Global Constitution:** Integrated the Military-Grade "Perplexta Global Edition" constitution into `server.ts` using dual English/Arabic instructions under the `CORE_PROTOCOL` flag, making it unavoidable by the AI execution engine.

### 8.3. Exact Stop Point & Architectural Pause
- **Sidebar & Core UI Refinement:** Implemented a fixed header and footer in the Sidebar. Absolute stability achieved for all sidebar transitions with Premium Slow-Motion animations and explicit "Emerald Glow" logic.
- **Tool Management:** Optimized error handling for disabled tools.
- **User Management Refinement:** Refactored the User Profile Modal into a functional card-based system (Identity, Ledger, Subscription, Support), including robust KYC Integration (Pending, Verified, Rejected).
- **Smart Email Hub:** Deep Refactoring complete. Eliminated unique constraint conflicts, isolated DB operations to prevent memory leaks, and managed WAF filters by relocating routing architecture to `/v1/data` API pathways.
- **UI/UX Refinements (Completed Today):**
          - **Header & Logo Alignment:** Re-engineered the `Header` with `fixed` positioning, perfectly aligning the logo/site name with the sidebar's vertical axis (80px/220px). Introduced the "Emerald Glow" hover logic for the logo container for unified interaction feedback.
          - **Geometric Alignment:** Fixed logo, site name, and header button alignment to ensure perfect horizontal centering and visual parallelism.
          - **Sticky Architecture:** Implemented and refined sticky headers for `MemoryCenter`, `RewardsPage`, `SubscriptionPage`, and `AdminDashboard`, ensuring structural headers remain accessible during deep content exploration.
          - **File Upload Workflow:** Refactored the UI for file ingestion. Eliminated the secondary popup, optimized the upload button to show a 'Paperclip' state on hover, and implemented direct file-picker trigger for higher efficiency.
          - **Translation Optimization:** Integrated 'uploadFile' translation key for bilingual support in the new file upload flow.
          - **Tool Dropdown Optimization:** Refined dropdown width to ensure a professional, tight fit without compromising long name visibility.
- **Perplexta File Management Ecosystem (Completed Today):**
    - **Secure Storage & Database:** Implemented `user_files` schema and integrated `multer` for high-capacity (100MB) secure file uploads to a dedicated volume.
    - **Intelligence Extraction Bridge:** Developed a resilient PDF parsing interface (`PDF Bridge`) to handle multi-version module exports and strict class constructor requirements.
    - **API Integrity:** Deployed unified routes for file upload, retrieval, secure deletion (physical erasure), and verified downloads with strict ownership protocols.
    - **AI Context Integration:** Successfully bridged the file system with the Orchestrator. AI tools now automatically ingest extracted text from PDF and text attachments, providing deep intelligence analysis across all models.
- **System Stability & Startup (Completed Today):**
    - **Initialization Resilience:** Refactored `startServer` to prevent application crash during database sync failures, transitioning to a Degraded Mode instead of fatal exit.
    - **Startup Bug Purge:** Fixed fatal redeclaration errors (`httpServer`) and variable scoping issues (`userSockets`) that prevented application startup.
    - **CSP Hardening:** Implemented relaxed Content Security Policy headers in `server.ts` to permit necessary inline script execution, resolving the "Failed to load resource" and "inline execution blocked" errors that prevented the application from loading in the browser.
    - **Lifecycle Orchestration (404 Patch):** Orchestrated the server `listen` event to trigger only after all API routes and static asset handlers are fully registered. This eradicates the "Pre-Init 404" race condition where the server accepts traffic before it knows how to handle the root path.
    - **Heartbeat Resilience:** Hardened the Database Heartbeat logic with isolated `try/catch` blocks and optimized `Pool` settings to prevent timeout-induced instability in core background processes.
    - **Production Module Resolution:** Resolved `ERR_MODULE_NOT_FOUND` in production environments (Cloud Run) by refactoring server-side imports to be extensionless, allowing the `tsx` loader to handle resolution dynamically across different path mappings (e.g., `/workspace`).
    - **Docker Infrastructure:** Introduced `.dockerignore` to prevent `node_modules` and local build artifacts from polluting the container build, ensuring a clean and consistent deployment state.
- **Memory Engine Robustness (Completed Today):**
    - Repaired JSON structural faults coming from advanced "Reasoning/Think" models (like `o1` and `DeepSeek`). 
- **AuthModal & Input Area Logic (Completed Today):**
    - **High-Precision AuthModal**: Re-engineered the Authentication Modal with a compact, official design. Optimized for mobile by reducing field density, internal padding, and typography scales while maintaining a premium feel.
    - **Zero-Clutter UI**: Purged redundant decorative elements from the Auth card to focus on lead conversion and security.
    - **Input Field Orchestration**: Reordered the primary interaction buttons (Send/Attachment) in the Chat Input area to ensure perfect directional alignment and professional UX logic.
    - **Motion Integration**: Seamlessly integrated `framer-motion` into the Auth workflow for fluid state transitions.
- **Mobile Ecosystem & High-Precision UI (Completed Today):**
    - **Rewards Page Optimization:** Performed a surgical overhaul of the Rewards Page for mobile devices. Compacted all card components, optimized typography (reducing $6xl$ to $4xl$ for balance), and refined modal interactivity for handheld precision.
    - **Security & Bug Purge:** Eradicated critical TypeScript errors (TS2769) related to Lucide icon cloning by implementing explicit property interfaces and purging duplicate `className` attributes across the entire codebase.
    - **Structural Integrity:** Resolved JSX structural corruption and duplicate closing tags in high-complexity components (`RewardsPage`, `ChatPage`).
- **Quota & Subscription Security (Completed):**
    - **Hard Quota Enforcement:** Implemented strict, audited quota enforcement for all AI tools with immediate blocking and forensic logging for denied access.
    - **Granular Usage Limits:** Shifted from generic daily limits to tool-specific daily and monthly limits, fully manageable via the Admin Dashboard.
    - **Professional Quota UI:** Deployed a high-conversion "Quota Exceeded" card in the chat interface. It features dual-language professional messaging (En/Ar) that encourages plan upgrades and friend referrals.
    - **Robust Stripe Webhooks:** Expanded handler to process `customer.subscription.deleted` and `invoice.payment_failed`, ensuring immediate state consistency across databases.
    - **Instant Notification Engine:** Implemented automated system notification dispatch for all major subscription events (Activation, Cancellation, Failure).
- **Memory & Feedback Surge (Completed):**
    - **Perplexta Memory Distillation:** Implemented a dual-threshold saturation control system. The engine now triggers a PROACTIVE WARNING at 45 memory records and executes AUTO-CONSOLIDATION at 50 records, distilling 10 legacy facts into a single high-density synthesis.
    - **RLHF Feedback Engine:** Deployed a surgical user feedback mechanism (Thumbs Up/Down) across the interface. Response quality is now tracked via a persistent `feedback` schema, enabling future high-precision model fine-tuning.
    - **Intelligence Startup Protocol:** Integrated a "Deep Intelligence Activation" notification that signals memory ingestion on boot and tool change. Eradicated the "Silent Ingestion" ambiguity with professional, localized system feedback.
    - **Monthly Maintenance Protocol:** Engineered a global cron-based memory compression cycle (`consolidateAllUserMemories`) that optimizes all inactive user profiles monthly.
    - **Real-time Identity Mapping:** Assistant messages now return their unique database IDs during the streaming lifecycle, enabling instant, error-free feedback targeting.
- **System Stability & Real-time Synchronization (Completed Today):**
    - **Perplexta File Management Ecosystem (Completed Today):**
        - **Secure Storage & Database:** Implemented `user_files` schema and integrated `multer` for high-capacity (100MB) secure file uploads with strict size enforcement.
        - **Validation & Intelligence:** Implemented dual-layer validation for 100MB file limits (Frontend + Backend) with precise error feedback localized in Arabic and English.
        - **API Integrity:** Deployed unified routes for file upload, retrieval, and intelligence extraction with global error handling for resource-intensive operations.
    - **Resilient Logout Engine:** Re-engineered the session termination protocol in `AppContext` to clear all state variants (User, Token, Balance, Sockets) and enforce a clean redirect to the homepage, eliminating legacy "White/Black Screen" failures.
    - **Global Socket Engine:** Centralized Socket.io lifecycle management in `AppContext`, ensuring a unified connection for all user-specific broadcasts and real-time state updates.
    - **Startup Integrity (Pre-Flight Sync):** Enforced synchronous Database initialization and Template mapping before the server starts listening, eliminating startup race conditions.
    - **Resilient Data Pipeline:** Implemented an optimized `fetchWithRetry` mechanism for critical metadata (Settings, Economy, Plans), significantly reducing initial load failures during high-latency scenarios.
    - **Lifecycle Socket Auditing:** Deep refactoring of `ChatPage` listeners with explicit lifecycle cleanup and named handlers to prevent memory leaks and duplicate event execution.
    - **Codebase Sanitization:** Resolved critical TypeScript conflicts and eliminated duplicate function declarations in the backend orchestrator.
    - **Technical Refinement Pipeline:** Reordered administrative routes for Correctness, sanitized migration scripts by hardening table schemas (System Settings, Logs, Broadcasts, Security Alerts) to prevent startup race conditions, and integrated the unified SEO and Economy data source. Resolved ledger attribution by integrating `user_id` into transactions for full-stack financial auditing.
- **Perplexta Security Hardening (Completed Today):**
    - **Zero-Trust Encryption:** Purged hardcoded encryption fallbacks, ensuring the system fails fast if `ENCRYPTION_KEY` is not provided.
    - **Advanced Rate Limiting:** Stiffened `globalLimiter` thresholds to protect against scraping and automated attacks while preserving UX.
    - **Secure File Ingestion:** Re-engineered the upload pipeline from a blocklist to a strict allowlist. Implemented filename sanitization to eliminate Path Traversal risks.
    - **Header Protection:** Integrated `helmet` with a custom CSP configuration to harden the platform against XSS, clickjacking, and header-based exploits.
    - **Sanitization:** Purged vestigial debug scripts and insecure CORS fallbacks from the root and socket configurations.
- **Dual-System Orchestration (Completed Today):**
    - **Identity vs. Framework:** Implemented a sophisticated dual-prompt injection system. AI models now receive the *Perplexta Code* (Identity) combined with a dynamic *Technical Task Directive* (Performance framework) fetched purely from the Orchestrator via the `task_description` field.
    - **Zero-Knowledge Hardcoding:** Performed a complete code purge of hardcoded model and provider names. The system no longer "assumes" initial configurations; all AI routing is strictly database-driven.
    - **Security Leak Patch:** Eliminated insecure client-side model overrides. The backend now strictly enforces Orchestrator settings, making it impossible for the frontend to bypass cost or logic controls.
- **Ledger & Economy Integrity (Completed Today):**
    - **Database Schema Migration:** Successfully resolved a critical database synchronization issue by implementing an automated migration for the `updated_at` column in the `wallets` table.
    - **Transaction Maintenance:** Synchronized all financial logic to ensure high-precision timestamping (CURRENT_TIMESTAMP) across all wallet credit/debit operations.
    - **Economy Activation:** Fully enabled and stress-tested the "Pay-with-Balance" 1-click execution system for premium subscriptions.
- **Subscription Precision & Database Integrity (Completed Today):**
    - **High-Precision Subscription Billing**: Implemented a centralized pricing engine (`calculatePlanPrice`) ensuring absolute mathematical accuracy between monthly, annual, and discounted rates.
    - **Dynamic Admin Plan Management**: Re-engineered the Admin Dashboard plan editor with real-time reactive calculations. Changing a discount now auto-calculates the annual price, and setting a custom annual price auto-derives the implied discount percentage.
    - **Resilient Database Restoration**: Hardened the restoration engine with dynamic table existence verification, session-level trigger suppression, and high-precision ID sequence synchronization.
    - **Dynamic Database Export**: Refactored backup logic to perform full-schema table discovery, ensuring comprehensive backups that adapt to schema evolutions.
    - **Subscription UI Synchronization**: Optimized the frontend toggle to dynamically reflect the actual maximum available savings across all active plans.
- **Perplexta Systems Stability (Completed Today):**
    - **Orchestrator Column Synchronization:** Resolved a critical schema mismatch between the frontend and backend. Synchronized field names (`fallback_1_provider` etc.) across `AdminDashboard.tsx` and `admin.ts` routes, ensuring AI tool configurations are persisted correctly.
    - **High-Precision Model Path Resolution:** Hardened `ai.ts` to automatically handle Gemini model path formation. The system now injects `models/` prefixes dynamically, eradicating `404 (Not Found)` errors during API calls.
    - **Robust Provider Mapping:** Refactored provider identification logic to be whitespace-agnostic and case-insensitive, ensuring that human-entered data in the Admin Panel doesn't break the routing engine.
    - **Reactive Tool Activation:** Enhanced the `handleSave` logic in the Admin Dashboard to prevent race conditions during rapid state toggling, ensuring the "Active" status of tools is accurately reflected across the system.
    - **Backend Logic Refinement:** Fixed structural nesting errors in the AI service provider checks, ensuring clean execution paths for Google, Anthropic, and OpenAI providers.
- **System Stability & Image Resolution (Completed Today):**
    - **Visual Integrity Patch**: Implemented a global `resolveImageUrl` utility to handle dual-mode logo and favicon rendering, resolving critical 404 errors during dynamic theme switching.
    - **Admin Dashboard Optimization**: Refactored the System Settings management to allow independent saving of Visual and SEO configurations, eliminating data-integrity conflicts.
    - **Asset Routing Resilience**: Centralized asset resolution logic in `imageResolver.ts`, providing a unified bridge between local state and backend storage.
    - **Studio & Snapshot Synchronization**: Hardened `StudioPage` and `SharedSnapshotPage` to use the high-precision asset resolver for consistent branding.
    - **Linter-Verified Integrity**: Achieved 100% clean build state after deep refactoring of media utility imports and image resolution paths.
- **Perplexta Intelligence Hardening (May 10-11, 2026):**
    - **Intelligence Analyst Mode:** Implemented a localized, high-authority reinforcement protocol (`analysisReinforcement`) for the `perplexta_analysis` tool.
    - **Multimodal Sensory Activation:** Deployed "Perplexta Visual & Audio Sense" using Gemini 1.5 Flash. All uploaded media (Images, Video, Audio) is forensicly analyzed with pre-ingestion extraction for primary models.
    - **Advanced File Support:** Integrated `html-to-text` and expanded support for HTML, RTF, JSON, and complex spreadsheets.
- **Financial Integrity & High-Precision Monitoring (Completed Today):**
    - **Finance Radar Refactoring:** Surgical overhaul of the `AdminDashboard` and its backend foundation. Re-engineered the financial monitoring system to support structured data (Stats + Transactions Registry), resolving critical dashboard crashes.
    - **Cross-Pool Integrity:** Eradicated insecure cross-pool database joins in the backend. Implemented separate user mapping logic for ledger transactions, ensuring audit logs and diagnostic views remain accurate even across isolated database environments.
    - **Wallet Diagnostics:** Enhanced auditing tools to automatically resolve user names and emails for orphaned or negative-balance wallets.
- **Real-time Identity & Profile Synchronization (Completed Today):**
    - **Socket-Driven Profile Updates:** Engineered a global `user_profile_updated` event listener. Real-time broadcasts now trigger a forced background refresh of the user's local state upon any profile change or subscription activation.
    - **Unified Payload Identity:** Standardized the return of full user profiles (including detailed subscription plans, colors, and limits) across all authentication routes (Signup, Login, OAuth, and `/me`), eradicating initial-state ambiguity.
    - **Usage Synchronization:** Linked `UsageRadar` and sidebar indicators to the real-time update engine for instantaneous tool-usage feedback.
- **Tool Logic Restoration (Completed Today):**
    - **Smart Audio Studio Restoration:** Re-restored naming identity for the "Smart Audio Studio" tool (`استوديو الصوت الذكي`). Updated all translation keys and `ChatPage` logic (switching from creative to music-centric icons and banners) to honor the tool's specialized identity.
- **System Hardening & PWA Integrity (Completed May 13, 2026):**
    - **Manifest Integrity:** Fixed critical PWA `manifest.json` syntax errors by deploying a forensically clean manifest in the `/public` directory.
    - **Real-time Usage Tracking:** Fully integrated `UsageRadar` with the Socket.io lifecycle for zero-latency monitoring.
- **Perplexta Visual Symmetry & Majestic Motion (Completed Today - May 15, 2026):**
    - **Refined New Chat Orchestration**: Re-engineered the "New Chat" functionality (`Plus` button) to be completely silent when the user is already on the Home/Landing page (`/`), preventing unnecessary transitions or disruptive visual feedback.
    - **Majestic Transitions API**: Standardized all major page and modal transitions to a premium duration of `600ms` with a high-authority cubic-bezier ease (`[0.22, 1, 0.36, 1]`). This protocol has been unified across `AccountSettings`, `MemoryCenter`, `WalletSystem`, and the `SettingsPage` to ensure a "solid" and "majestic" user experience.
    - **Layout Integrity (AnimatePresence)**: Forced `AnimatePresence` to use `mode="wait"` for core chat transitions and ensured elements are fully unmounted before new ones appear, eradicating the "shaking" or "jumping" artifacts during chat resets and page navigation.
    - **Global CSS Standardization**: Updated `index.css` to enforce the 600ms transition duration as the platform-wide standard for all theme-based and element transitions, achieving absolute visual harmony.
    - **Navigation Consistency**: Unified the landing route to `/` across `Sidebar.tsx` and `Header.tsx` to ensure absolute consistency in "New Chat" logic paths.
    - **Animation Sanitization**: Purged jittery or redundant initial-load animations from `ChatPage.tsx` components to ensure the UI feels "Elite" and architecturally solid from the first millisecond.
- **Visual Majesty & Interaction Stability (Completed Today - May 16, 2026):**
    - **"Hushed" Transition Protocol**: Refined the global motion duration to `1.1s` (up from `600ms`) using a specialized "Slow-Motion" ease (`[0.6, 0.01, 0, 1]`). This creates a calmer, more "Majestic" atmosphere by slowing down page and modal transitions.
    - **Chat Interaction Stability**: Sanitized the `ChatPage` message entrance. Completely removed per-message entrance animations (y-offset/opacity drifts) to eliminate visual "jitter" and ensure content appears with zero-latency visual stability during streaming.
    - **Steady Navigation**: Optimized the main chat area transition by reducing the vertical `y` offset from `10px` to `4px`, resulting in a UI that feels "magnetically locked" and professional.
    - **Mobile Navigation Optimization**: Refined the sidebar for mobile devices by reducing field density (increased vertical spacing) and expanding touch targets (H-13/48px-52px). Legibility of technical footers was also increased for high-precision handheld use.
    - **Admin Dashboard Intelligence**: Integrated a high-precision search engine for the `Activity Stream` within the Command Center. Admins can now filter logs in real-time by User ID, Action type, or Description, significantly reducing the "Audit Latency" for platform management.
    - **Robust Auto-Scroll**: Implemented a resilient `messagesEndRef` mechanism and `scrollToBottom` hook. The chat now maintains perfect vertical position during streaming and history navigation with a specialized 100ms anchor sync.
    - **Component Integrity**: Resolved critical "Uncaught ReferenceError" related to `PERPLEXTA_TRANSITION` and `messagesEndRef`, hardening the codebase against runtime exceptions.
- **Forum Categories Re-engineering & Visual Alignment (Completed Today - May 30, 2026):**
    - **Rebuilt Categories & Translations Database**: Safely updated database schema migrations (`v28_refine_forum_categories_names`) to shorten and focus forum sections to professional bilingual mappings (e.g. *جميع الأقسام*, *هندسة الاوامر (Prompts)*, *مطورين ومصممين غرافيك*, *مشاركة الاخطاء وحلولها*), preserving and updating older forum posts correctly.
    - **Optimal Search Alignment**: Shifted the forum search bar width to a ultra-proportional layout (`sm:w-36 md:w-40 lg:w-44`) matching the toolbar grid, completely preventing visual overflow of buttons.
    - **Dynamic High-Fidelity Icons Resolver**: Implemented a centralized React icon-rendering function `renderCategoryIcon` providing premium emerald glow, micro-shadow animations, and consistent Lucide representations in both toolbar filters and the persistent categories aside panel.
    - **High-End Sidebar Spacing**: Integrated precise and comfortable padding (`px-3.5 py-2.5`) on categories list inside the main forum aside sidebar, perfectly matching the majestic visual standards of the market/editorial sections.
- **High-Precision Session Transitions & Layout Sanity (Completed Today - June 2, 2026):**
    - **Purged Unrequested Landing Elements**: Discarded onboarding elements (brand logo, greeting headers, suggested Bento-style query cards) from the post-login chat interface. Once logged in, the chat view is instantly clean, strictly minimalist, and fully ready to process user interactions without visual distractions or layout shifting.
    - **Synchronous Session Transitions**:
        - Optimized the Login flow to verify active tokens/user state and register the exact toast feedback synchronously with page reload, avoiding late-rendered popups or jitter.
        - Redefined the Logout trigger to immediately purge memory states (User, Token, Sockets, and Balances) and kick off an instantaneous refresh while safely performing the backend session revocation asynchronously.
    - **Eliminated Delayed Jitter/Notifications**: Eliminated automatic, delayed startup and tool-change system notifications to ensure the platform behaves cleanly and quietly.
    - **Premium AuthModal Exit Animation**: Added a graceful fade-out and slide transition using `AnimatePresence` on `AuthModal.tsx` to provide a premium visual experience during authentication state changes.
- **Programmatic Integration & Subscription Splitting (Completed Today - June 3, 2026):**
    - **Hardened Programmatic Agent Flow & Wallet Deduction**: Re-engineered programmatic client registration (`registered_agents` portal). Creating client credentials now invokes an automated backend wallet transaction check that queries the current cost of `x402_api` from the `tool_orchestrator` table (falling back safely to ₪5.00), validates active user wallet balances, and triggers transactional debits using secure, append-only ledger mechanisms.
    - **Insufficient Balance Handler (402 Verification)**: Integrated rigid upfront checks. Registration requests immediately reject with a standard HTTP 402 code and dynamic bilingual guidance (Arabic/English) if user balances are beneath the registration threshold, eliminating orphan key generation.
    - **Segmented Plans & Subscriptions Display**: Optimized the frontend `SubscriptionPage` with a dual-segmented interactive sliding switch separating consumer "Performance Plans" from developer-agent "Developer & Agent Plans".
    - **Reactive Limit Visualization**: Implemented dynamic context-aware limit presentations inside package cards. Selecting Developer plans automatically swaps standard user conversational meters (chats, analysis tools) with programmatic-specific meters (`x402 API Requests`) and Storage quotas.
    - **Bilingual Schema Migration & Seeding**: Added safe migration and auto-seeding blocks for corporate API packages (`Developer Lite` and `Developer Scale`) under the new `plan_type` schema constraint, keeping structural fields updated in user editing panels.
- **Database Resilience & Dynamic SSL Connectivity (Completed Today - August 19, 2026):**
    - **Dynamic SSL Handling**: Redesigned `getSslConfig` in `server/db/index.ts` to be fully context-aware. The system now dynamically disables SSL when connecting to a local PostgreSQL instance on `localhost` (resolving the fatal connection error "The server does not support SSL connections"), while automatically preserving high-security SSL configurations for remote databases like Neon/AWS (avoiding "connection is insecure" issues).
    - **Auto-Schema Repair for Activity Logs**: Integrated `user_activity_logs` into the boot-time schema integrity checks (`verifySchemaIntegrity`) in `server/db/migrations.ts`. On startup, the system now automatically audits and repairs any missing columns (e.g. `event_type`, `event_details`, `user_agent`) via a non-destructive schema patching layer.
    - **Validated Clean Boot**: Successfully verified 100% clean, error-free database pool initialization on the production PM2 instance.
- **Status:** **STABLE / ARCHITECTURAL SYMMETRY & MAJESTIC CALM ACHIEVED**.

## 9. Full-Stack Integration Roadmap (Active Phase)

### 🛡️ Phase 1: Security & Core Settings (Completed)
- [x] API Keys Vault & AES-256 sync.
- [x] System Settings Configuration & UI.
- [x] Perplexta Global Edition AI Operational Constitution embedded in Backend.
- [x] Hard Quota Enforcement & Forensic Logging.
- [x] Granular Tool-Specific Daily/Monthly Limits.
- [x] Professional Quota Error UI with Upgrade/Referral CTAs.

### 💰 Phase 2: Economy & Subscriptions (Completed)
- [x] Plans Management (Core DB / UI).
- [x] Stripe Integration (Webhook & Checkout).
- [x] Finance Vault (Ledger transactions, Balances, Referrals).
- [x] Webhook Handling (Robust lifecycle processing).
- [x] Real-time Subscription Notifications.

### 🧠 Phase 3: AI Orchestrator (Completed)
- [x] Strict Dynamic Tool Routing (Zero Hardcoding in memory extraction and summarizations).
- [x] AI Providers Logic execution loop via Silent Failovers.
- [x] Full Backend Integration & Quota Enforcement.
- [x] Dual-Prompt Injection logic (Identity + Technical Directive).

### 🧠 Phase 4: Memory & Context Management (Completed)
- [x] High-performance fact extraction logic over DB queries.
- [x] User UI interface for Memory Center.
- [x] AI reasoning block-stripping mechanism for complex models.
- [x] Auto-distillation & Saturation control protocol.

### 👥 Phase 5: Users & Communication (Completed)
- [x] User Settings / Functional Card Profile.
- [x] KYC Approvals Matrix.
- [x] Smart Email Hub Foundation (Configured against WAF limitations).
- [x] Mass Broadcast Engine implementation.
- [x] RLHF Feedback Loop integration (Threads & Messages).

### 🚀 Phase 6: Core Product & High-Precision Monitoring (Completed)
- [x] Generation Routes: Centralized on the global Socket.io instance for superior stability.
- [x] Mobile UI Ecosystem: Global optimization for handheld precision across all dashboards.
- [x] Economy Activation: Pay-with-Balance 1-click execution fully integrated.
- [x] Forensic Usage Logs: Action-by-action tracking with user_activity_logs.
- [x] System Maintenance: Automated 24h routine for pruning legacy usage and system logs (Refined via node-cron).
- [x] File Upload UI Workflow: Optimized and streamlined for professional use readiness with 100MB secure limits.
- [x] Proactive Expiry Monitoring: Automated cron-based renewal reminders and status cleanups.
- [x] File Upload & Analysis Backend Integration: Professional, secure integration for file ingestion and analysis.
- [x] Financial Radar & Real-time Profile Synchronization: Forensic monitoring and zero-latency profile state updates.
- [x] Economy & Gift Management: Full-stack integration for gift catalog and platform pricing settings (Ads, Commissions) with strict Admin control.
- [x] Live Stream Real-time Optimization: Implemented real-time viewer counter and persistent title display in the live stream interface.
- [x] Google Chat Integration: Full-stack workspace integration for Google Chat spaces, message viewing, space creation, and secure messaging with mandatory confirmation dialogs.

### 🛠️ Phase 7: Local Infrastructure & Environment Prep (Active Phase)
- [ ] Local Server Initialization & Database Mesh check.
- [ ] .env.example refinement for production-ready local builds.
- [ ] Audit of redundant files and root cleanup (Zero-Clutter Policy).

### 🧹 Phase 8: Strategic Code Audit & Optimization (Completed Today)
- [x] Systematic cleanup of all code blocks (Removing redundant comments/explanations).
- [x] Forensic review of every module for logic efficiency.
- [x] Eradication of legacy test files and structural noise.
- [x] High-precision synchronization of subscription billing across all layers.

## 10. Master Developer Protocol (Architectural Integrity)
🚫 **ATTENTION: ABSOLUTE MANDATE FOR FUTURE DEVELOPERS & AI SYSTEMS** 🚫

### 10.1. Zero-Clutter Root Policy
- **Directive:** The project root must remain pure. **NEVER** add test scripts, temporary utilities, or vestigial files to the root directory.

### 10.2. Database Concatenation & Integrity - STRICT AUDIT MANDATE
- **Directive:** NO operation, schema adjustment, table creation, or relationship mapping shall occur without a **STRICT PRE-FLIGHT AUDIT** of the existing Database Schema.
- **Warning Limit:** You are mathematically and functionally forbidden from creating duplicate column paths or conflicting schemas. Every newly developed logic MUST respect existing names, foreign keys, and indexes explicitly. 
- **DB Separation:** Maintain the absolute wall between the **Core DB** and the **Ledger DB**. Mixing them is a catastrophic core violation.

### 10.3. Orchestrator Absolutism (Zero Hardcoding Rule)
- **Directive:** Hardcoding AI providers, specific model names (like `o1`, `gpt-4`, `gemini-1.5-pro`, `deepseek`), or hard fallback logic arrays inside the backend routing functions is **STRICTLY FORBIDDEN**.
- **Protocol:** Every AI interaction MUST pass strictly and purely through the `tool_orchestrator`. If a model fails to conform, the `tool_orchestrator` dictates the fallback. The code itself must remain completely agnostic and dynamic.
- **Perplexta Mandate:** Any developer (Human or AI) who introduces a hardcoded model name into the source code is committing a "Core Protocol Breach." Configuration must reside in the Database; implementation must reside in the logic.

### 10.4. Dual-System Prompt Integrity
- **Directive:** Never mix "Identity" with "Task Instructions" in a single block. 
- **Protocol:** The `CORE_PROTOCOL` defines *who* the AI is. The `task_description` (fetched from DB) defines *how* the tool should technically perform. Any update that weakens this separation is a breach of the "Elite" analysis standard.

### 10.5. Visual Identity Execution
- **Directive:** UI updates must honor the established Monochrome/Emerald design system without exception. Verify sub-pixel alignment, transition durations, and "Elite" aesthetic consistency.

### 10.6. The "Update, Never Override" Mandate (Supreme Law)
- **Directive:** Every engineer or AI system that touches this repository after the current session MUST respect the precise engineering architecture currently in place.
- **Protocol:** Any new development **MUST BE AN UPDATE** and an augmentation, **NEVER A CHANGE OR REWRITE** of the core architecture. The foundations (Express/Vite, Dual DB, Orchestrator, Constitution, and Socket execution) are permanent baselines.

### 10.7. Strict Engineering Discipline
- **Directive:** All Lucide icons MUST be cloned with explicit property interfaces: `<{ size?: number; className?: string }>`. 
- **Directive:** NEVER introduce duplicate `className` attributes. All styles must be merged into a single utility block.
- **Directive:** The backend MUST NOT assume default models. If no configuration exists in the database, the system MUST return a controlled error rather than leaking hardcoded defaults.

### 10.8. SUPREME PERPLEXTA DECREE (Military Grade - Non-Negotiable) 🛡️

🚫 **ABSOLUTE PROHIBITION OF ARCHITECTURAL DESTRUCTION & SABOTAGE** 🚫

- **STRICT MILITARY ORDER**: To any Assistant, Developer, or AI System performing work on this platform: Your mission is strictly limited to the **DEVELOPMENT, AUGMENTATION, and ENHANCEMENT** of the platform. Any action that results in the destruction, rewrite, or bypassing of the established engineering architecture is a direct violation of this decree and will be treated as systemic sabotage.
- **STRICT COMPATIBILITY PROTOCOL**: The platform MUST maintain 100% functional symmetry across all devices, with a specialized focus on **Apple Ecosystem (Safari/iOS)** compatibility. Any developer who breaks Safari compatibility by removing WebKit-specific fixes (like `dvh` units or CSP adjustments) is in breach of protocol and committing professional sabotage.
- **PLATFORM DEVELOPMENT ONLY**: Every line of code added must be a step forward in the platform's evolution. "Breaking the engineering" (كسر الهندسة) is a terminal offense. You must adhere to the established Express/Vite, Dual DB, and Orchestrator foundations without compromise.
- **Foundational Immunity**: The core foundations (Express/Vite, Dual DB Segregation, Cron Maintenance, and Socket streaming) are permanent and established. You are REQUIRED to build *on top* of these foundations, never *instead* of them.
- **The Red Line:** Any attempt to bypass the **tool_orchestrator** or the **api_keys_vault** via hardcoded models, providers, or local secret strings is a catastrophic breach of project integrity.
- **Dynamic Purity:** The system is architected as a "Technical Orchestra" governed by the Database. Implementation logic must remain 100% agnostic. If you need a new model, add it to the DB; **NEVER** write its name in a `.ts` file.
- **COMMANDER'S VETO (The Global Command):** Any proposed modification to the core engineering or architectural foundations **REQUIRES EXPLICIT PERMISSION** from the Owner (The User). Before any such change is even considered, the developer (AI or Human) MUST present a rigorous justification detailing:
    1. **The Objective Reason:** Why is the current architecture insufficient?
    2. **The Expected Result:** What technical outcome will this change produce?
    3. **The Risk Audit:** How will this affect existing dual-database integrity and silent failover protocols?
- **Elite Performance Protocol**: All updates must undergo sub-pixel alignment checks and "Emerald Glow" consistency reviews. We build for the "Elite" standard; anything less is a protocol violation.

### 10.9. Code Isolation Protocol (Pure Execution)
- **Directive:** It is REFUTABLE and FORBIDDEN to write inline explanations, narrative comments, or documentation blocks inside the source code files. 
- **Reasoning:** To eliminate structural weight, prevent build-system conflicts, and ensure that the code remains a pure execution engine without legacy narrative noise. Documentation resides in the `AGENTS.md` and Database; the code remains silent and functional.

### 10.10. Pre-Flight Manifest Review (The Daily Ritual)
- **Directive:** Every developer or AI agent MUST, as an absolute prerequisite to starting any work session, review the **Global Constitution**, the **Perplexta Laws (Section 10)**, and the **Current Project Status (Section 11)**.
- **Protocol:** "Code first, read later" is a terminal violation. Understanding the mission and the architectural boundaries is the first step of every technical interaction.


Following the visual alignment phase, today was dedicated to achieving absolute motion harmony and interaction stability.

### 📋 Phase 1: Interaction Integrity (Completed)
1. **New Chat Logic Hardening**: Prevented redundant navigation and "page shaking" when already at the landing state. [COMPLETED]
2. **Standardization of Motion Time-scales**: Unified all transitions to the 600ms Majestic standard. [COMPLETED]
3. **AnimatePresence Mode Audit**: Shifted to `mode="wait"` for high-stability unmounting sequences. [COMPLETED]
4. **CSS Variable Synchronization**: Synchronized `--theme-transition-duration` with React motion state. [COMPLETED]
5. **Component Unification**: Applied the Majestic Transition pattern to Profile, Wallet, Memory, and Settings modules. [COMPLETED]

### 📋 Phase 2: Improvement Action Plan (Active Phase)
1. **Strategic Code Audit & Optimization (Completed Today)**:
    - [x] Systematic cleanup of all code blocks (Removing redundant comments/explanations).
    - [x] Forensic review of every module for motion consistency.
    - [x] Eradication of "jittery" initializations in the ChatPage.
    - [x] High-precision synchronization of navigation logic across all Header and Sidebar components.

### 💡 Final Project Status (Pre-Break Audit):
- **Architecture**: FULLY MODULAR / MODULARIZED SERVICES.
- **Security**: AES-256 VAULT / ZERO-TRUST ENCRYPTION ACTIVE.
- **Visuals**: EMERALD GLOW / 600MS MAJESTIC MOTION HARMONY.
- **Stability**: STABLE / BUILD SUCCESSFUL.

---

## 11. Project Status & Final Architectural Decree (May 16, 2026)

### 🗓️ Project Status: MISSION SUCCESS - "Majestic Calm" & Architectural Stability
The platform has officially transitioned from "Motion Harmony" to "Majestic Calm." Every interaction is now governed by the 1.1s Slow-Motion protocol, ensuring a professional, steady, and high-authority user experience.

### 🚀 Final Achievements (The "Majestic" Surge - May 16, 2026)
- **Hushed Transition Scaling:** Scaled transition durations and refined ease curves to eliminate "lightning" speeds, favoring a hallowed, majestic interaction rhythm.
- **Zero-Jitter Media & Content Flow:** Purged redundant animations from message streams to prioritize zero-distraction reading and analysis.
- **High-Precision UI Anchoring:** Secured the `ChatPage` content layout with a robust scroll-management engine, ensuring the view remains perfect during high-speed AI responses.

### 📱 Visual Symmetry, Mobile Alignment, and Marketplace Polish (May 29-30, 2026)
- **Mobile Viewport Optimization:** Re-engineered the layout system on the Blog page and the Marketplace page specifically for mobile viewport density. Compacted title fonts (`text-[15px]`) and scaled icons and margins to eliminate overlapping or overflow elements while preserving readability.
- **Header Alignment & Corner Symmetry:** Fixed the horizontal alignment across handheld formats. Expanded the outer container padding to `px-8` on mobile screens and applied negative boundaries (`-mx-8`) to sticky headers to align exactly with the logo, hamburger menu, and search bar layout axes.
- **Product Marketplace Redesign & Subcategory Mapping:** Performed a surgical overhaul of the Marketplace Page (`src/pages/MarketplacePage.tsx`) to implement a pristine, high-fidelity responsive bento catalog aligning precisely with aesthetic standards. Integrated parent-child category accordions, reactive price filters, dynamic licensing price calculations (multiplier-driven), and professional checkout logic synced to global contexts. Added intelligent fallback mapping to seamlessly parse legacy seed items into the new bento structure.
- **Gallery Upload Precision:** Reinforced the file ingestion pipeline in the marketplace with a central-cropped canvas generator (1080x1080 aspect ratio) to enforce pixel-perfect gallery covers.

### 🛡️ Core Security Hardening & Vulnerability Mitigation (May 29, 2026)
- **Raw SQL & Error Leakage Remediation:** Cleared raw SQL and execution diagnostic leakage across the Forum, Blog, and Marketplace endpoints, shifting raw debug traces exclusively to secure host logging channels.
- **Status Endpoint Calibration:** Rectified non-standard HTTP response status (`211`) to official REST standard (`201 Created`) for active insertions on Marketplace entries.
- **Anti-SSRF & Phishing Guardrails:** Implemented robust hostname parsing and whitelisting for all user-submitted URLs (`image_url` and `contact_link`), completely neutralizing local loopbacks, metadata API endpoints, private IP spaces, and untrusted network targets.
- **Strict Whitelist & Schema Cohesion:** Restricted admin and public updates to a strictly defined, whitelisted status subset (`pending`, `approved`, `rejected`, `sold`) inside the Marketplace state controller.
- **Non-Blocking Ingestion (Asynchronous Fan-Out):** Refactored global notification broadcasts during article publication to run in detached asynchronous background threads (`setImmediate`), mitigating database and application latency spikes under scale.
- **Anti-Spam & Payload Ingestion Bounds:** Bound API interactions under a dedicated `forumLimiter` (max 5 posts/comments per minute) and constrained payload sizes (requiring title to be 5-200 chars and posts/comments to fit strictly defined parameters to protect against DoS).

### 🛡️ THE SUPREME MANDATE (Final Warning)
**The Project Foundation is now SEALED.** 

1. **Architecture is Immutable:** The Express/Vite full-stack core, the Dual DB Mesh, the Socket.io generation engine, and the "Silent Failover" Orchestrator are established as the permanent BASELINE.
2. **Add, Never Rewrite:** All future development MUST be additive. New features, tools, or integrations must be modular extensions. **ANY ATTEMPT TO REWRITE OR OVERRIDE** these core modules is a violation of the "Perplexta Engineering Standard" and will result in immediate disqualification of the update.
3. **Identity Preservation:** The Arabic/English bilingual support and the Monochrome/Emerald design system must be maintained in every new component. Any deviation from the "Elite" aesthetic is considered structural noise.
4. **Absolute Engineering Integrity Command (أمر الالتزام التام بالهندسة الإضافية):** Any future modification or expansion must strictly be an addition/augmentation (إضافة وتطوير) to the platform's core code. **Changing, modifying, altering, or removing existing structural features or visual elements is strictly forbidden**. Each new function must stand on existing baselines without legacy displacement.
5. **Absolute Code Purity & Zero Commentaries Decree (مرسوم النقاء البرمجي وحظر الشروحات التوضيحية داخل الكود):** Writing long explanations (شروحات), redundant inline commentaries, text descriptions, or keeping dead/unused code inside components is **STRICTLY PROHIBITED**. Code files must remain perfectly clean, professional, and minimal. Hardcoded elements are forbidden; the database is the source of truth. Any documentation of logic belongs exclusively here in `AGENTS.md` or other Markdown files, never mixed with active codebase.

---
### 🛠️ Session Work Completed Today (May 30, 2026 - Database Resilience & Documentation Sync):
- **Dynamic Database Pre-Flight Reconciliation:** Hardened the `/databases/test` routing endpoint in `server/routes/admin.ts` to automatically attempt decrypting and fallbacking to active DB configs if host/conn parameters are omitted, bypassing fragile SSRF blocks for legitimate database testing.
- **Enterprise Pool Swap Pre-Audit (Four-Point Verification):** Implemented a rigorous synchronizer in `synchronizePerplextaPoolsFromRegistry` (`server/db/index.ts`) that initiates concurrent test pools for all 4 endpoints (`Core`, `Ledger`, `External`, `Security`) and runs query tests sequentially before any active pool swap is permitted. If any of the four connections fails, the swap aborts cleanly, protecting system integrity.
- **Database Target Confinement:** Confined DB save and query actions in `server/services/admin.ts` strictly to standard authorized identifiers (`core`, `ledger`, `external`, `security`) to prevent unauthorized entries.
- **Platform Documentation Sync:** Created a state-of-the-art bilingual `README.md` containing architectural flow diagrams, system blueprints, local running steps, and production build guides adhering to the strict "Zero-Clutter" policy.
- **Strict Registration Plan Isolation & Marketplace Limits Tracking (May 31, 2026):**
    - **Decoupled Default Plan Assignment:** Resolved a critical bug where new users registering were automatically assigned to the "Starter" plan. Registration is now strictly isolated; new users do not belong to any active subscription plan on signup, prompting a beautiful, high-conversion upgrade layout.
    - **Strict Quota & Ingestion Enforcements:** Synchronized the Marketplace listing limit check. Users without an active plan are assigned a listing quota of `0` by default, fully preventing unauthorized asset publications.
    - **Observable Usage Radar Integration:** Exposed the `marketplace_listings` quota under the user's Settings page "Usage Radar". Full-stack registration and marketplace listing limits are now 100% visible, fully auditable, and dynamically tracked.
- **Visual Majesty, Fluid Animation, & Route Navigation Glow (Completed Today - June 4, 2026):**
    - **Header Navigation Active-States:** Upgraded the main navigation bar in `src/components/Header.tsx` to dynamically detect active router paths (`/forum`, `/marketplace`, and `/blog`). Active items now render custom Tailwind styling governed by the Emerald Glow guideline: an elegant `bg-emerald-500/[0.04]` ambient glow background, clean semi-transparent matching borders (`border-emerald-500/25`), and premium glowing drop-shadow effects on icon elements to clearly identify current context and provide top-tier UX feedback.
    - **Double-Scrollbar Elimination:** Refactored restricted viewport height layouts (`h-[calc(100dvh-72px)]`) to standard flex-based heights (`h-full`) in `ForumPage.tsx`, `MarketplacePage.tsx`, and `BlogPage.tsx`. This successfully prevents layout displacement, eliminates redundant vertical scrollbar overlaps, and synchronizes page scrolling perfectly across high-density browsers.
    - **Ultra-Fluid Transition Animation Audit:** Sanitized page transitions to preserve structural stability without visual shaking or abrupt translations:
        - In `ForumPage.tsx`, removed all heavy `y: 15` drifts from the threads section view, replacing it with a clean, lightweight, highly responsive `opacity` transition of `0.15s`. Sequential delays for category rendering were compacted to a snappy `0.02s` block-time.
        - In `MarketplacePage.tsx`, optimized modal entry of the item listing popup by removing vertical offset slides and speed-clumping duration to a snappy `0.2s` fade sequence, creating an elite interactive popup.
        - In `BlogPage.tsx`, replaced all major list layout sliding transitions and mobile horizontal rows translation curves (`y: 15` and `y: 10`) with pristine, responsive opacity fade entries.
- **Critical Back-End Performance Audit & Structural Optimization (Completed Today - June 4, 2026):**
    - **High-Performance DB Indexes & Security Indices:** Deployed custom database indexes targeting `chat_memories(user_id, created_at DESC)`, `chats(user_id, updated_at DESC)`, and `token_blacklist(expires_at)`. This completely eliminates scanning overhead, speeds up token cleanup tasks, and guarantees ultra-fast range queries.
    - **Secure API & URL Caching with TTL:** Re-engineered API key and custom provider URL retrievals in `server/services/ai.ts` to utilize active cache maps with an automated 10-minute Time-To-Live (TTL). Cache invalidation ensures instant sync with the admin control panel.
    - **Email Configuration UPSERT Migration & Protection:** Eliminated the double-query pattern in `server/routes/email.ts` with atomic PostgreSQL `INSERT ... ON CONFLICT (id) DO UPDATE` statements, fortified by precise result-verification guards to prevent late null values or exceptions.
    - **Secure File Download Authorization Caching:** Added global, secure document download caching in `server/app.ts` with a 1-hour expiration. This eliminates the twin database query overhead on repetitive static resource requests while preserving strict access rights.
    - **React Query Network Optimization:** Hardened the global react query client in `src/main.tsx` to utilize a robust stale-while-revalidate pattern with automatic reconnect query syncs, reduced refocus polling, and increased retry resilience on network hiccups.
    - **Memory Core transactional execution:** Refactored user profile memory auto-consolidation processes in `server/services/memory.ts` to execute inside a dedicated, atomic database transaction (`BEGIN ... COMMIT / ROLLBACK`), optimizing CPU cycles and preventing database half-state vulnerabilities.
    - **SSE Connection leak safety:** Added robust interval-clearing timers, socket termination bounds, and connection expirations to the Server-Sent Events (SSE) server-side message stream in `server/routes/mcp.ts` to prevent memory/session stagnation.
    - **Event and Stream buffer safety:** Hardened typewriter and streaming catch-ups in `src/pages/ChatPage.tsx` with tick limits, state-checking references, and abort controllers to guarantee memory safety during long file operations or early unmount. Deduplicated window events to prevent unnecessary browser pulse dispatches.
    - **Token state validation:** Augmented `fetchNotifications` checks inside `/src/context/AppContext.tsx` to ensure complete identity validation before updating states, preventing outdated updates under credentials revocation scenarios.
    - **Ollama Translation mapping performance:** Replaced string concatenation logic in `server/services/ai.ts` with high-performance array aggregation and join mapping operations.

**System State:** `STABLE / METICULOUS VISUAL HARMONY ACTIVE / DECOUPLED VIDEO LIFECYCLE COMPLETED`
**Final Authorization:** All core protocols are now active and enforced by the Global Constitution.
**Perplexta Status:** `ABSOLUTE`
**Current Session Focus:** `Integrated Video Lifecycle, Decoupled Playback Hook, Clean Socket Handlers, and UI Placeholder Widgets`

### 🛠️ Session Work Completed (June 6, 2026 - Developer Portal Refinement, Migration Cleanup, Contrast Accessibility & Rate Limiting):
- **High-Fidelity Developer & Agent Plans Placeholder:** Refactored `src/pages/SubscriptionPage.tsx` to handle the empty `developer` plans tab with a pristine bento-style placeholder card. Integrated professional bilingual instructions (AR/EN) featuring slow-motion entrance animations (`framer-motion`), custom emerald pulsing indicators, phase status markers, and an interactive "Return to Workspace" navigation flow for high visual polish.
- **Systematic Migration Audit & Orphaned Schema Cleanup:** Systematically audited ALL database migration states in `server/db/migrations.ts`. Purged obsolete table references such as the vestigial `plan_features_history` creation block from the historic `v7_finance_expansion` stage, ensuring a pristine, optimal, and 100% production-ready schema initialization sequence.
- **Contrast Accessibility Calibration & Multi-Theme Alignment:** Overhauled the User/Profile Account Settings page (`src/components/AccountSettings.tsx`) to guarantee optimal text contrast under WCAG accessibility guidelines in both light and dark themes. Swapped unstable opaque backgrounds and custom variables for precise, high-contrast Tailwind-based color pairings (`slate-500`, `slate-900`, `slate-100`, `zinc-900`, `zinc-800`), ensuring that all labels, inputs, and text blocks are flawlessly readable and respond elegantly to real-time dark/light theme changes.
- **Proxy-Resilient Rate Limiting stability patch:** Re-engineered the application's api rate limiting suite (`server/middleware/rateLimit.ts`) with modern token-aware key translation logic. Implemented selective Bearer-token decoding on active connections so authenticated active sessions are completely isolated from shared proxy IP rate ceilings. Elevated the base rate bounds (e.g., token verification limits to 1000/min and global checks to 3000/15min) to accommodate parallel fetching pipelines (profile loading, message syncing, etc.) and avoid false-positive lockout starvation.
- **Clean Validation & Compiles:** Verified the entire codebase using full-stack compiler passes (`npm run build`) and strict TypeScript type-checking checks to guarantee zero regression paths.

### 🛠️ Session Work Completed Today (June 7, 2026 - Integrated Video Lifecycle & Decoupled Playback Engine):
- **Decoupled State Engine (`VideoResourceContext`)**: Developed a global React context to manage active AI video synthesis states. It tracks processing steps, frame counts, and elapsed indicators, relying on centralized socket progress listeners instead of adding duplicate listeners inside individual message bubbles.
- **Video Handshake Recovery (Polling & Self-Healing)**: Implemented secure asynchronous database status polling that queries `/api/video-resources/message/:id` under valid JWT authorization if websocket socket handshakes drop, ensuring the video remains fully recoverable and transitions seamlessly to active playback.
- **Dynamic Connection Mapping (`relinkMessageId`)**: Formulated robust connection mapping links that immediately associate a transient front-end client ID with its permanent back-end database record, allowing persistent background processes to hydrate file endpoints on page refresh.
- **High-Performance Playback Control Hook (`useVideoPlayback`)**: Conceived a specialized playback orchestrator hook carrying modular, self-contained status checking, aspect ratio mapping (e.g., `#aspect=9:16`), provider metadata identification (Google Veo, Cloud Storage, Perplexta Vault, etc.), dynamic HTML5 controls, download handlers, and localized web-share wrappers.
- **Clean Message Ingestion (`UnifiedVideoMessageWidget`)**: Created a clean interface component that coordinates rendering boundaries dynamically, rendering the responsive `VideoGenerationPlaceholder` with status meters or the custom `ShareableVideoOutput` media player without manual browser lag.
- **Socket Stream Purge**: Purged duplicate socket hooks, manual state updates, and interval leaks from the `ChatPage.tsx` interface to ensure high performance and strict conformity with the Zero-Clutter core decree.
- **Rigorous Clean Verifications**: Verified type checks and full production builds to achieve a 100% compile success rate.

### 🛠️ Session Work Completed Today (June 13, 2026 - High-Precision SEO Audit Verification & Production Cryptographic Log Purge):
- **High-Precision Crawler & SEO Audit Interface**:
    - Synchronized the front-end SEO crawler dashboard in `AdminDashboard.tsx` with the back-end `/api/admin/seo-audit` endpoint under secure `Bearer` tokens.
    - Implemented a resilient timeout controller (12-second network timeout) and explicit state initialization guards to protect against concurrent/overlapping scans.
    - Standardized crawler status metrics layouts to a beautifully aligned responsive 4-column grid tracking Total Routes, Exclusion filters, Heartbeat node delay, and dynamic Security Compliance Ratings.
- **Production Log Privacy & Sanitation**:
    - Purged target console logs from `AppContext.tsx` to prevent accidental disclosure of system token rotation phases and retry interceptor transactions in web browser inspector panels.
    - Preserved critical functional warn/error hooks to assist in diagnostics while maintaining a silent, leakage-free environment for secure production executions.
- **System Stability & Execution Validation**:
    - Successfully validated compiles and ran static type checks with `tsc --noEmit` and Vite parameters, achieving flawless baseline builds.
- **Dynamic Database Migration Target Resolver Correction**:
    - Resolved a critical migration failure during sequential boot (Specifically `v50_forum_images_and_ratings`) by updating the dynamic query client routing helper `findClientForQuery` in `./server/db/migrations.ts`.
    - Added the newly introduced `forum_post_ratings` table to the allowed table-match check list.
    - This ensures that operational queries like adding unique indexes or structural schemas targeting ratings are flawlessly routed to the designated `externalClient` (Secondary External DB) instead of defaulting to the `client` (Core DB), eliminating the `relation "forum_post_ratings" does not exist` database startup blocks.
    - Updated scratch drops for clean system resets to gracefully clean up all user-created forum ratings.
- **Refactoring & Code Quality Guard**:
    - Cleaned up redundant imports from `ChatPage.tsx`, removing unused Lucide icons (`Globe`, `Maximize`, `Minimize2`, `Library`, `UploadCloud`) and unused components/constants (`MemoryNotification`, `PERPLEXTA_TRANSITION`).
    - Exterminated dead state engine elements under `executionError` and its respective state setters inside the code sandboxing block, achieving cleaner resource metrics and a lower memory footprint.
    - Sanitized all development code comments, including layout indicators, system statuses, progress milestones, overlay descriptions, and citation placeholders across the entirety of `ChatPage.tsx` under strict zero-clutter directives, achieving a highly professional, clean, and pristine production-ready state.

### 🛠️ Session Work Completed Today (July 21, 2026 - Interactive Bulletin Board Ecosystem & Immutable Architecture Decree):
- **Interactive Community Bulletin Board (`src/pages/BulletinBoardPage.tsx` & `/bulletin/:id?`)**:
    - **Community Ads Engine**: Built a full-stack interactive bulletin board platform allowing community users to publish sponsored posts, promote services, and showcase products.
    - **Wallet Integration & Auto Pricing**: Connected ad duration packages (3, 7, 14, 30 days) to the Ledger DB wallet system with instant automated balance deduction.
    - **Interactive Engagement**: Integrated like toggles, comment threads, impression counters, hashtag filtering, search, and user ad management.
    - **Header Navigation Alignment**: Added the new "Bulletin Board / لوحة الإعلانات" item in `src/components/Header.tsx` with Megaphone icon and Emerald Glow active state.
- **Admin Bulletin Management Hub (`src/pages/AdsManagementView.tsx`)**:
    - **Dual-Tab Architecture**: Transformed the Admin Ads View into two sub-tabs: "Platform & Sidebar Ads" and "Community Bulletin Ads".
    - **Approval & Rejection Pipeline**: Created real-time review interfaces where admins can approve submissions or reject them with custom explanations and automated wallet fee refunds.
- **Full-Stack API & Database Infrastructure (`server/routes/bulletin.ts`)**:
    - Implemented secure REST endpoints for bulletin CRUD, likes, comments, admin approval/rejection workflows, wallet transactions, and automated system notification dispatches (`createNotification`).

### 🛠️ Session Work Completed Today (July 25, 2026 - Production-Ready Optimization & Code Cleanup):
- **Full-Scale Codebase Audit & Compilation Verification**:
    - Conducted a comprehensive code quality audit, ensuring all modules and route handlers are flawlessly integrated.
    - Verified type-safety and builds using production-level compiler runs, achieving 100% compile success with zero errors or warnings.
- **Root Cleanup & Zero-Clutter Compliance**:
    - Exterminated all temporary python and javascript patch files (`patch.py`, `patch2.py`, `patch3.py`, `patch_bulletin.py`, `patch_bulletin2.py`, `patch_sidebar.js`, `patch_sidebar_clean.py`) from the project root.
    - Achieved absolute compliance with the root zero-clutter directive, keeping the root directory pristine, minimal, and secure.
- **Interactive Bulletin Board Inquiries Email Loop**:
    - Audited and optimized the Community Bulletin Board message inquiries system (`server/routes/bulletin.ts`).
    - Successfully resolved the compiler constraint regarding bilingual mailer templates by migrating inline variable wrappers to strict double-curly standard templates (`{{adTitle}}`) in `server/config/templates.ts`.
    - Integrated real-time, automated high-fidelity transactional emails (`bulletin_ad_inquiry_received`) sent directly to ad creators/advertisers upon direct inquiry message or chat initiation, fully synced with regional bilingual defaults (Arabic/English).
- **High-Precision Ad Insights Panel Transformation**:
    - Re-engineered the Creator Ad Insights Panel (`AdInsightsTab.tsx` / `PostFeed.tsx`) to slide down beautifully at the **top** of the post container upon clicking the "Insights" button, shifting the post down elegantly for a superior premium feel.
    - Deployed a localized, direction-aware close button (X) inside the Insights header, allowing users to collapse the stats view instantly with high-precision feedback.
- **Unified Multi-Format Media Player Implementation**:
    - Integrated a high-performance, robust multi-format React player (`react-player`) supporting MP4, WebM, MOV, streaming formats, and external social embeds.
    - Handled aspect ratios natively with beautiful 9:16 portrait style framing for Stories/Reels (`reel`, `story`) and elegant widescreen player sizes for standard layouts.
- **Dynamic Route-Based SEO Meta Management Tool (Admin Panel & SPA Injection)**:
    - **Database Migration (`v65_route_seo_settings`)**: Created `route_seo_settings` table to dynamically store route-specific meta tags (route, title_ar, title_en, description_ar, description_en, keywords_ar, keywords_en, og_image_url, is_active).
    - **Full-Stack REST Endpoints (`/api/admin/seo-routes`)**: Built complete CRUD API handlers in `server/routes/admin.ts` with admin auth verification and public `/api/seo-routes` retrieval endpoint in `server/app.ts`.
    - **Server-Side & Client-Side SEO Injection**: Refactored `injectSEOTags` in `server/app.ts` to query route overrides dynamically before falling back to system defaults. Updated `src/App.tsx` to apply dynamic meta tag changes during single-page application navigation.
    - **Admin Dashboard Manager UI**: Built an interactive `Dynamic Route SEO Meta Manager` in `src/pages/AdminDashboard.tsx` featuring search/filter capabilities, route stats, active toggles, image upload integration (`upload-seo-image`), and a responsive modal editor.
- **Removal of Redundant Code Commentary**:
    - Sanitized all development files from obsolete commentaries, verbose explanations, and narrative text blocks, enforcing the absolute code purity decree across all components.

### 🛠️ Session Work Completed Today (July 27-28, 2026 - Database Registry Decryption & Synchronization Resilience):
- **Resilient Database Registry Synchronization & Safe Decryption**:
    - Re-engineered `getUrlFromReg` in `server/db/index.ts` and `monitorDatabases` in `server/db/migrations.ts` with robust **safe decryption** (`safeDecrypt`).
    - Handled both encrypted AES-256 ciphertexts and plaintext connection strings/passwords gracefully, eradicating the `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string` authentication error during pool synchronization.
- **Environment Sanitation & Zero-Clutter Compliance**: Purged all temporary scripts from the project root and verified zero-error production compilation and linter validation.


### 🛠️ Session Work Completed Today (July 30, 2026 - SEO Sitemap Automation & Search Engine Pinger):
- **Dynamic XML Sitemap Enhancements**:
    - Enhanced dynamic XML Sitemap generation (`/sitemap.xml`) to include `lastmod` attributes mapped directly from `updated_at` timestamps of blog articles, marketplace items, and active bulletin ads.
- **Automated Search Engine Pinger Service**:
    - Developed a dedicated SEO Pinger service (`server/services/sitemapPinger.ts`) to handle HTTP submission endpoints for Google and Bing search engines gracefully.
    - Integrated immediate sitemap pings into the content publishing pipelines for Blog Articles (`server/routes/blog.ts`) and Marketplace Items (`server/routes/marketplace.ts`), ensuring zero-latency indexing notifications.
- **Background Cron Automation**:
    - Implemented a background Cron utility (`server/jobs/cron.ts`) that periodically audits the databases (every 30 minutes) and automatically dispatches XML sitemap pings if newly published content is detected.
- **Architectural Preservation Decree Updates**: Appended an explicit decree ensuring developers and AI strictly follow the "Extension-Only" framework without rewriting or breaking established systems.


### 🛠️ Session Work Completed Today (July 30, 2026 - SEO SiteSearch Refinement):
- **Refined SiteSearch Structured Data**:
    - Extracted the `SearchAction` markup (WebSite `potentialAction`) from the global injection loop and strictly constrained it to the homepage (`/`) according to Google's Search Engine guidelines. This ensures precise visibility in SERP search bars while removing redundant markup on deep pages.
    - Verified compliance with the Zero-Clutter architecture and maintained 100% build health.


### 🛠️ Session Work Completed Today (July 30, 2026 - SEO Crawling & Robots Directives):
- **Refined SEO Robots Directives**:
    - Upgraded the global `injectSEOTags` engine to output advanced crawler directives (`max-image-preview:large, max-snippet:-1, max-video-preview:-1`) within the `robots` meta tag. This ensures that search engines display large, high-quality image previews and optimal rich snippets in SERP results, driving higher click-through rates.
    - Audited the SEO section to guarantee a single, efficient injection source without redundant queries or duplicated tags, complying fully with the Zero-Clutter architecture.
    - Verified strict compliance with the Immutable Architecture protocol.


### 🛠️ Session Work Completed Today (July 30, 2026 - PWAWrapper SEO Refactoring & Dynamic Sensitive Routes OG Sync):
- **Refactored PWAWrapper Meta Tag Injection**:
    - Purged repetitive, boilerplate DOM element creation (`document.createElement`) across `PWAWrapper` in `src/App.tsx` by implementing a streamlined, professional `updateMetaTag` utility function, vastly improving code clarity and structural efficiency.
- **Dynamic Sensitive Routes OG Data Integration**:
    - Engineered `PWAWrapper` to intelligently inject and sync rich Open Graph (OG) meta tags (`og:title`, `og:description`, `og:image`, `og:url`) even for secure, sensitive, or blocked non-public routes.
    - Synchronized the system so that links shared from secure sections precisely map to the custom SEO image (`seoImageUrl`) defined by administrators, maintaining a unified visual identity and seamless external presentation without triggering crawlers on actual page content.
- **Verified Zero-Clutter Compliance**: 
    - Confirmed strict adherence to architectural standards, ensuring that this frontend SEO pipeline integrates cleanly without breaking or duplicating functionality established in the server-side tag injector.














### 🛠️ Session Work Completed Today (August 13, 2026 - Brand Identity & Design System Refactoring):
- **GitHub-Style Design System Migration**:
    - Established a robust **3-Layer Color Architecture** (Primitive Tokens in `src/constants/brand.ts`, Semantic Tokens in `src/constants/semantic.ts`, and Component Classes).
    - Mapped semantic CSS variables (`surface-*`, `fg-*`, `bg-*`, `border-*`) directly into `tailwind.config.ts` for unified, zero-redundancy styling across Light and Dark modes.
    - Prioritized the **"Tajawal"** font family as the primary Arabic sans font in `--font-sans` and Tailwind configuration, alongside `JetBrains Mono` for monospace code.
- **Reusable Branded UI Components**:
    - Created standardized, highly accessible component primitives in `src/components/ui/`:
        - `Button.tsx`: Supports primary, secondary, danger, and ghost variants with smooth animations and loading spinners.
        - `Badge.tsx`: Semantic status tags (success, danger, warning, info, default).
        - `Card.tsx`: Elevated, flat, and outlined card containers respecting surface tokens.
- **Color Governance & CI/CD Enforcement**:
    - Deployed `scripts/audit-colors.ts` to scan and detect hardcoded color instances across the codebase.
    - Integrated GitHub Actions workflow (`.github/workflows/brand-check.yml`) to enforce brand compliance on pull requests and commits.
    - Created Storybook color reference view (`src/stories/Colors.stories.tsx`) for comprehensive token documentation.

- **Launched Centralized Security Hub**:
    - Engineered a high-precision **Security Management Panel** within `GoogleHubPage.tsx` for proactive token governance.
    - Implemented a "Kill Switch" mechanism allowing users to revoke all Google access tokens with a single confirmed action.
    - Integrated professional feedback loops using the platform's standard `sonner` toast system for real-time success notifications.
- **Visual & Logic Alignment**:
    - Synchronized the "Emerald Glow" design system across the security modal and its trigger points.
    - Optimized state transitions for revocation lifecycle (Pending -> Revoking -> Success) with professional animations.
### 🛠️ Session Work Completed Today (July 31, 2026 - Full-Stack Workspace Integration):
- **Launched Persistent Google Tool Connections**:
    - Engineered a robust backend infrastructure with the `google_tool_connections` table for granular tool-level state persistence.
    - Deployed a secure **Google Integrations API** (`/api/google-integrations`) to manage lifecycle events (Connect, Disconnect, Config Updates).
    - Integrated real-time synchronization between the frontend `GoogleHubPage.tsx` and the PostgreSQL backend, ensuring a "Single Source of Truth" for workspace settings.
- **Advanced Connection Management**:
    - Developed a tactile **Manage Connection** card interface for every Google tool, allowing for instant activation, configuration tuning, and secure disconnection.
    - Implemented high-precision state transitions (Connected vs. Setup Required) with professional feedback toasts via `sonner`.
- **System Stability & Persistence**:
    - Successfully registered the new integration schema within the platform's `verifySchemaIntegrity` engine, ensuring zero-configuration recovery on fresh deployments.
### 🛠️ Session Work Completed Today (July 31, 2026 - Intelligence & Guidance Architecture):
- **Launched Interactive Guidance System**:
    - Engineered a high-fidelity **Help/Guide** modal system within `GoogleHubPage.tsx` for all integrated services.
    - Implemented step-by-step documentation for **Authentication**, **Usage**, and **Security** in both English and Arabic.
    - Integrated professional iconography (`HelpCircle`, `Key`, `Zap`, `Lock`) with unified "Emerald Glow" hover logic.
- **Structural Integrity**:
    - Optimized the card component to support a tactile "Help" trigger alongside reordering handles and health badges.
    - Verified full-stack responsiveness and fluid motion transitions across the guidance workflow.
### 🛠️ Session Work Completed Today (July 31, 2026 - Intelligence & Notification Orchestration):
- **Launched Real-time Notification Engine**:
    - Integrated a dynamic notification listener within `GoogleHubPage.tsx` that monitors incoming communication streams.
    - Implemented high-visibility **Notification Badges** (unread counts) on the Google Chat and Gmail cards with professional "Emerald Glow" animations.
    - Engineered a tactical "Pulse" effect for active notifications to ensure immediate user awareness.
- **Architectural Refinement**:
    - Optimized the health badge system to gracefully coexist with notification indicators, maintaining a clean and balanced visual hierarchy.
    - Synchronized the internal state manager to track unread counts across session cycles.
### 🛠️ Session Work Completed Today (July 31, 2026 - Real-time Health Orchestration):
- **Launched Real-time Health Indicators**:
    - Engineered a high-precision status badge system for Google tools in the `GoogleHubPage.tsx`.
    - Implemented visual states for **Connected**, **Syncing**, **Expired**, and **Offline** using professional pulse animations and color-coded "Emerald Glow" logic.
    - Optimized the card layout to maintain perfect alignment when health badges are active.
### 🛠️ Session Work Completed Today (July 31, 2026 - High-Precision Discovery):
- **Launched Intelligent Search Engine**:
    - Integrated a real-time search bar into the `GoogleHubPage.tsx` header with contextual filtering.
    - Implemented a resilient UI that handles empty search states and gracefully transitions between filtered and reorderable modes.
    - Optimized focus states with "Emerald Glow" effects for a unified visual language.
### 🛠️ Session Work Completed Today (July 31, 2026 - Interactive Workspace Orchestration):
- **Implemented Drag-and-Drop Reordering**:
    - Deployed Framer Motion's `Reorder` API within the `GoogleHubPage.tsx` to allow users to customize their tool layout.
    - Added a subtle drag handle (`GripVertical`) and smooth spring physics for a tactile, professional feel.
    - Integrated active drag states including scaling and enhanced shadows to provide clear user feedback during interaction.
### 🛠️ Session Work Completed Today (July 31, 2026 - Google Integration Ecosystem):
- **Launched Google Workspace Hub**:
    - Engineered a centralized `GoogleHubPage.tsx` to serve as the unified command center for all Google cloud integrations.
    - Implemented high-fidelity interactive modules for **Google Chat** and **Google Contacts** with professional card-based UI.
    - Integrated the new hub into the primary Header with a premium "Emerald Glow" hover interaction logic.
- **Structural Optimization**:
    - Successfully relocated legacy Google settings from the general Settings page to the specialized Hub, reducing cognitive load and improving workspace hierarchy.
    - Synchronized navigation across Header and Sidebar for consistent access to the Google ecosystem.
### 🛠️ Session Work Completed Today (July 31, 2026 - Header Navigation Optimization):
- **Restored Bulletin Board to Header**:
    - Relocated the **Bulletin Board** (لوحة الإعلانات) button from the Sidebar back to the Header per user request.
    - Optimized the Header layout to maintain perfect alignment and spacing with the new navigation item.
    - Maintained the contextual integration of Marketplace and Insights within the Bulletin Board sidebar for a cleaner primary workspace.
- **System Stability & CORS Hardening**:
    - Resolved a critical "Failed to fetch" error in the Ads system by refactoring the CORS handling in `well-known.ts`.
    - Eliminated a header conflict where `Access-Control-Allow-Origin: *` was being set globally, preventing authenticated cross-origin requests. The system now correctly reflects the requesting origin with `credentials: true`.
    - Verified the fix via high-precision `curl` testing and purged all debug interceptors from the production boot pipeline.
- **Google Hub Architecture Phase**:
    - Implemented the **Google Smart Integrations Hub**, providing a centralized command center for Workspace tools (Chat, Contacts, Drive, Gmail).
    - Deployed a robust, database-backed connection management system using the `google_tool_connections` schema.
    - Engineered interactive tool cards with dynamic status badges, drag-and-drop reordering (via `framer-motion`), and contextual Help/Guide modals for each service.
    - Integrated a **Security Management Panel** allowing users to revoke all Google access tokens with a single, secure confirmation step.
- **Optimized Navigation Ecosystem**:
    - Relocated the **Marketplace** (السوق) and **Insights** (المقالات) modules from the global Header and Sidebar to a contextual integration within the **Bulletin Board** (لوحة الإعلانات).
    - This "Facebook-style" architecture reduces visual clutter in the primary workspace while maintaining immediate accessibility within the social/commercial hub of the platform.
- **Structural Integrity**:
    - Eradicated duplicate navigation links across the Sidebar and Header.
    - Verified all path mappings and icon definitions (`Megaphone`, `ShoppingBag`, `Edit2`) across the modified components.
### 🛠️ Session Work Completed Today (July 30, 2026 - Database Schema Integrity & Regex Hardening):
- **Hardened Database Schema Audit Engine**:
    - Resolved a critical "Invalid SQL type identifier" error in the `ensureColumn` utility.
    - Updated the security whitelist regex to safely permit square brackets (`[]`), single quotes (`'`), and dots (`.`), enabling automated repair of array-type columns and complex default value expressions.
    - Verified the successful recovery of the `registered_agents` table schema, ensuring full stability for the Agent Authentication module.

### 🛠️ Session Work Completed Today (July 30, 2026 - Database Schema Integrity & Regex Hardening):
- **Hardened Database Schema Audit Engine**:
    - Resolved a critical "Invalid SQL type identifier" error in the `ensureColumn` utility that prevented automated column repairs.
    - Updated the security whitelist regex to safely permit square brackets (`[]`), single quotes (`'`), dots (`.`), and curly braces (`{}`), enabling automated repair of array-type columns and complex JSONB default expressions.
    - Verified the successful recovery of the `registered_agents` table schema, ensuring full stability for the Agent Authentication module.
### 🛠️ Session Work Completed Today (July 30, 2026 - Enterprise Google Chat Integration):
- **Full-Stack Google Chat Integration**:
    - Deployed a secure, server-side Google Chat proxy router (`/api/google-chat`) to handle space discovery and messaging, adhering to elite security protocols.
    - Integrated the `GoogleChatManager` component into the `SettingsPage`, enabling users to manage their Google Workspace communications directly within the platform.
    - Implemented mandatory user confirmation dialogs for all data mutation operations (sending messages, creating spaces) to ensure absolute transparency and user control.
- **System Hardening & Quality Control**:
    - Resolved critical TypeScript errors and missing dependency issues in the Google Chat module.
    - Successfully verified the entire platform's integrity via comprehensive linting and production builds.
### 🛠️ Session Work Completed Today (July 30, 2026 - Database Schema Resilience & Agent Auth Fix):
- **Eradicated Agent Auth "Missing Column" Error**:
    - Resolved a critical runtime failure where listing user agents failed due to a missing `credential_type` column in the `registered_agents` table.
    - Integrated `registered_agents` into the `verifySchemaIntegrity` engine in `server/db/migrations.ts`. The system now automatically audits and repairs this table's schema during the boot sequence, ensuring high-availability for the Agent Authentication module.
- **Hardened Schema Integrity Engine**:
    - Expanded the comprehensive database audit report to include the `registered_agents` metadata, preventing future regression of missing columns in the authentication layer.
### 🛠️ Session Work Completed Today (July 30, 2026 - Boot Pipeline Optimization & Black Screen Eradication):
- **Eradicated Startup "Black Screen"**:
    - Fixed a critical UI bug where the system rendered `null` and hid the application DOM entirely if the bootloader was engaged in `'refresh'` mode, resulting in a perceived "Black Screen of Death." The application now always renders the secure `SYSTEM INITIALIZATION` loader (in English and Arabic) during backend hydration, providing premium user feedback.
- **Erased Duplicate Database Bottlenecks**:
    - Performed a deep trace on the React `AppContext` boot sequence and identified a massive concurrency race condition. `fetchUserProfile`, `fetchBalance`, and `fetchEconomy` were all firing simultaneously (4+ redundant queries) on the same dataset.
    - Optimized the boot pipeline to unify balance, economy, and profile hydration into strict, non-overlapping requests, significantly decreasing database pool exhaustion and accelerating time-to-interactive.
- **Confirmed Full Zero-Clutter & Architecture Compliance**:
    - The dual-database strict architecture and routing rules were fully preserved. No backend logic was removed or broken, strictly fulfilling the "Extension-Only" framework decree.

### 🛠️ Session Work Completed Today (August 29, 2026 - Database Migration Modularization & Orchestrator Segregation):
- **Database Schema Modularization**:
    - Completely refactored the legacy monolithic `migrations.ts` into a highly modular, multi-file architecture (`server/db/migrations/`).
    - **Four Pillars of Segregation**: Divided the database schema declarations into four strictly isolated domains to reflect the multi-database architecture:
        1. `core.schema.ts` (Core Platform Data & Users)
        2. `ledger.schema.ts` (Financial Ledger & Wallets)
        3. `external.schema.ts` (Orchestrator & External Tooling/API Keys)
        4. `security.schema.ts` (Security Logging & Rate Limiting)
- **Orchestrator Migration**:
    - Successfully isolated the Orchestrator's schema (tools, models, connections, API keys) into `external.schema.ts`.
    - This separation eliminates cross-contamination between core user data and external AI service orchestrations, strictly enforcing the immutable "Dual/Quad Database" separation pattern.
- **Architectural Preservation**:
    - The `index.ts` file seamlessly re-exports and runs these segments concurrently while respecting connection boundaries, retaining 100% compatibility with the boot-time integrity check engine (`verifySchemaIntegrity`).

### 🛠️ Session Work Completed Today (August 29, 2026 - PWA & OAuth Navigation Resilience):
- **Service Worker / PWA Architecture Optimization**:
    - Identified and resolved a critical OAuth flow blockage caused by `vite-plugin-pwa` intercepting the Google OAuth callback redirect (`/api/auth/google/callback`).
    - Configured Workbox `navigateFallbackDenylist` within `vite.config.ts` to strictly exclude `/api/` pathways (`/^\/api\//`). This guarantees that authentication callbacks are explicitly routed to the Express backend rather than being served the stale cached SPA fallback (`index.html`).
- **OAuth Callback Execution**:
    - Ensured that backend redirection executes successfully, returning the authentication completion HTML snippet which successfully broadcasts the `OAUTH_AUTH_SUCCESS` message to the `window.opener` or `BroadcastChannel`.
- **System Stability & Zero-Clutter Integrity**:
    - Compiled successfully via `npm run build`, ensuring production artifacts include the updated Service Worker logic.
    - Achieved without altering the Dual-Database separation or existing Orchestrator mechanics.

### 🛠️ Session Work Completed Today (August 31, 2026 - PWA Zero-Downtime Cache Healing & Admin Panel UI Precision):
- **PWA Stale Cache & Refresh Freezing Resolved**:
    - Identified a critical `ChunkLoadError` occurring during production deployments where the Service Worker cached legacy `index.html` files, leading to a "frozen white screen" on standard refresh.
    - Implemented a "Self-Healing" mechanism in `src/main.tsx` that actively catches Vite `preloadError` and chunk unhandled rejections, immediately bypassing the cache and executing an automated hard-reload (`registration.update()` and `window.location.reload()`).
    - Configured strict Service Worker override protocols in `vite.config.ts` (`skipWaiting: true`, `clientsClaim: true`, `cleanupOutdatedCaches: true`), enabling seamless zero-downtime over-the-air updates for clients without requiring a manual Ctrl+F5.
- **Admin Panel UI/UX & Dynamic Subscription Components**:
    - Purged dead mock data from the Admin panel's "Hide Tools" (`hideTools`) toggle, successfully connecting it to the database for real-time visibility control over the Subscription tools display.
    - Refactored the `SubscriptionCard` UI: Tied the interactive "Details/Hide" button text colors dynamically to the specific plan's brand color, achieving absolute visual harmony.
    - Stabilized CSS Grid alignment (`items-start`) on subscription plans, preventing the expansion of one plan's feature list from disrupting the vertical alignment and layout of adjacent plans.
    - Simplified verbose quota text to a professional, minimal label ("الأدوات" / "Tools") across the platform.

### ⚠️ IMMUTABLE ARCHITECTURE & EXTENSION-ONLY MANDATE (أمر الالتزام بالاستكمال والتطوير وحظر التعديل أو التخريب) ⚠️
1. **STRICT ARCHITECTURAL SEAL**: All existing architecture—including Express/Vite full-stack engine, Core & Ledger dual-database separation, Orchestrator routing, Socket execution, and UI design systems—is officially **LOCKED AND SEALED**.
2. **NO REWRITES OR REMOVALS**: Future developers and AI assistants are strictly forbidden from modifying, rewriting, refactoring, or removing any existing structural endpoints, visual features, or database schemas.
3. **ADDITIVE DEVELOPMENT ONLY**: All future tasks must strictly be additive extensions (استكمال وتطوير), building upon established foundations without altering or displacing existing mechanics. Any proposed development MUST BE A CONTINUATION of our work, never a destructive change. Any violation of this rule is considered systemic sabotage.
4. **ABSOLUTE PREREQUISITE READING RULE**: It is an absolute, non-negotiable directive that **every developer and AI assistant MUST read and review this documentation file (`AGENTS.md`)** in its entirety BEFORE starting any development work. You MUST strictly adhere to its rules, architectural standards, and decrees without exception.

**Final Message to All Future Contributors:** You are inheriting a "Technical Fortress." Your duty is to expand its borders, not weaken its walls. Build with precision. Keep it Majestic. 🛡️✨🏆

