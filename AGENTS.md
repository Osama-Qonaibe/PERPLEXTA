# SOVEREIGN PLATFORM - Design System & Engineering Guidelines

## ⚠️ SUPREME SOVEREIGN DECREE ⚠️
**ATTENTION: ALL FUTURE DEVELOPERS & AI SYSTEMS**
This project is governed by immutable architectural principles. Any developer or AI that breaks these foundational rules is performing systemic sabotage.

1. **Update, Never Override**: Any new development **MUST BE AN UPDATE** and an augmentation, **NEVER A CHANGE OR REWRITE** of the core architecture (Express/Vite, Dual DB, Orchestrator, Constitution, and Socket execution).
2. **Orchestrator Absolutism**: **STRICTLY FORBIDDEN** to hardcode AI providers, model names, or fallback logic. All routing and configuration MUST reside in the database.
3. **Database Integrity**: The separation between **Core DB** and **Ledger DB** is absolute. Mixing them is a catastrophic breach. Pre-flight auditing of existing schemas *before* any migration is mandatory.
4. **Zero-Clutter Policy**: The project root must remain pure. **NEVER** add test scripts or vestigial files to the root directory.

*Failure to comply with these tenets is a direct violation of project sovereignty and will be treated as sabotage.*

## 0. Project Identity & Vision
**SOVEREIGN** defines the core vision, target audience, and architectural ambition of the platform:
- **Professional Elite Technical Analysis**

This identity serves as our compass. Every engineering decision—from the "Silent Failover" orchestrator to the zero-latency API key vault—is designed to uphold this "Professional Elite" standard.

## 1. Theming & Dark Mode
- **Engine**: Tailwind CSS v4 with class-based dark mode.
- **Configuration**: `@variant dark (&:where(.dark, .dark *));` in `index.css`.
- **Light Mode Vibe**: Clean "white paper" feel. Pure white backgrounds for main areas, very subtle gray borders (`border-gray-200` or `border-gray-100`).
- **Dark Mode Vibe**: Deep, immersive dark (`bg-[#0f0f11]` for body, `bg-[#1a1a1c]` for elements), with subtle `border-gray-800/60` borders.

## 2. Button Engineering (Input Area & Toolbars)
All interactive icon buttons must follow this exact structural pattern:
- **Base**: `bg-transparent border border-transparent transition-all duration-300`
- **Hover Background**: `hover:bg-gray-50 dark:hover:bg-gray-800`
- **Rounding**: `rounded-xl`
- **Size**: `w-10 h-10 flex items-center justify-center`

## 3. The "Emerald Glow" Pattern (Active/Hover States)
To indicate that a tool is active, ready, or being hovered over, we use a specific Emerald Glow effect instead of solid backgrounds.
- **Default Icon State**: `text-gray-400 transition-all duration-300`
- **Hover/Active State**: `text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]`

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
- **The Global Constitution:** Integrated the Military-Grade "Sovereign Global Edition" constitution into `server.ts` using dual English/Arabic instructions under the `CORE_PROTOCOL` flag, making it unavoidable by the AI execution engine.

### 8.3. Exact Stop Point & Architectural Pause
- **Sidebar & Core UI Refinement:** Implemented a fixed header and footer in the Sidebar. Absolute stability achieved for all sidebar transitions with Premium Slow-Motion animations and explicit "Emerald Glow" logic.
- **Tool Management:** Optimized error handling for disabled tools.
- **User Management Refinement:** Refactored the User Profile Modal into a functional card-based system (Identity, Ledger, Subscription, Support), including robust KYC Integration (Pending, Verified, Rejected).
- **Smart Email Hub:** Deep Refactoring complete. Eliminated unique constraint conflicts, isolated DB operations to prevent memory leaks, and managed WAF filters by relocating routing architecture to `/v1/data` API pathways.
- **UI/UX Refinements (Completed Today):**
          - **Header & Logo Sovereignty:** Re-engineered the `Header` with `fixed` positioning, perfectly aligning the logo/site name with the sidebar's vertical axis (80px/220px). Introduced the "Emerald Glow" hover logic for the logo container for unified interaction feedback.
          - **Geometric Alignment:** Fixed logo, site name, and header button alignment to ensure perfect horizontal centering and visual parallelism.
          - **Sticky Architecture:** Implemented and refined sticky headers for `MemoryCenter`, `RewardsPage`, `SubscriptionPage`, and `AdminDashboard`, ensuring structural headers remain accessible during deep content exploration.
          - **File Upload Workflow:** Refactored the UI for file ingestion. Eliminated the secondary popup, optimized the upload button to show a 'Paperclip' state on hover, and implemented direct file-picker trigger for higher efficiency.
          - **Translation Optimization:** Integrated 'uploadFile' translation key for bilingual support in the new file upload flow.
          - **Tool Dropdown Optimization:** Refined dropdown width to ensure a professional, tight fit without compromising long name visibility.
- **Sovereign File Management Ecosystem (Completed Today):**
    - **Secure Storage & Database:** Implemented `user_files` schema and integrated `multer` for high-capacity (100MB) secure file uploads to a dedicated volume.
    - **Intelligence Extraction Bridge:** Developed a resilient PDF parsing interface (`PDF Bridge`) to handle multi-version module exports and strict class constructor requirements.
    - **API Sovereignty:** Deployed unified routes for file upload, retrieval, secure deletion (physical erasure), and verified downloads with strict ownership protocols.
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
- **AuthModal & Input Area Sovereignty (Completed Today):**
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
    - **Sovereign Memory Distillation:** Implemented a dual-threshold saturation control system. The engine now triggers a PROACTIVE WARNING at 45 memory records and executes AUTO-CONSOLIDATION at 50 records, distilling 10 legacy facts into a single high-density synthesis.
    - **RLHF Feedback Engine:** Deployed a surgical user feedback mechanism (Thumbs Up/Down) across the interface. Response quality is now tracked via a persistent `feedback` schema, enabling future high-precision model fine-tuning.
    - **Intelligence Startup Protocol:** Integrated a "Deep Intelligence Activation" notification that signals memory ingestion on boot and tool change. Eradicated the "Silent Ingestion" ambiguity with professional, localized system feedback.
    - **Monthly Maintenance Protocol:** Engineered a global cron-based memory compression cycle (`consolidateAllUserMemories`) that optimizes all inactive user profiles monthly.
    - **Real-time Identity Mapping:** Assistant messages now return their unique database IDs during the streaming lifecycle, enabling instant, error-free feedback targeting.
- **System Stability & Real-time Synchronization (Completed Today):**
    - **Sovereign File Management Ecosystem (Completed Today):**
        - **Secure Storage & Database:** Implemented `user_files` schema and integrated `multer` for high-capacity (100MB) secure file uploads with strict size enforcement.
        - **Validation & Intelligence:** Implemented dual-layer validation for 100MB file limits (Frontend + Backend) with precise error feedback localized in Arabic and English.
        - **API Sovereignty:** Deployed unified routes for file upload, retrieval, and intelligence extraction with global error handling for resource-intensive operations.
    - **Resilient Logout Engine:** Re-engineered the session termination protocol in `AppContext` to clear all state variants (User, Token, Balance, Sockets) and enforce a clean redirect to the homepage, eliminating legacy "White/Black Screen" failures.
    - **Global Socket Engine:** Centralized Socket.io lifecycle management in `AppContext`, ensuring a unified connection for all user-specific broadcasts and real-time state updates.
    - **Startup Integrity (Pre-Flight Sync):** Enforced synchronous Database initialization and Template mapping before the server starts listening, eliminating startup race conditions.
    - **Resilient Data Pipeline:** Implemented an optimized `fetchWithRetry` mechanism for critical metadata (Settings, Economy, Plans), significantly reducing initial load failures during high-latency scenarios.
    - **Lifecycle Socket Auditing:** Deep refactoring of `ChatPage` listeners with explicit lifecycle cleanup and named handlers to prevent memory leaks and duplicate event execution.
    - **Codebase Sanitization:** Resolved critical TypeScript conflicts and eliminated duplicate function declarations in the backend orchestrator.
- **Dual-System Orchestration (Completed Today):**
    - **Identity vs. Framework:** Implemented a sophisticated dual-prompt injection system. AI models now receive the *Sovereign Code* (Identity) combined with a dynamic *Technical Task Directive* (Performance framework) fetched purely from the Orchestrator via the `task_description` field.
    - **Zero-Knowledge Hardcoding:** Performed a complete code purge of hardcoded model and provider names. The system no longer "assumes" initial configurations; all AI routing is strictly database-driven.
    - **Security Leak Patch:** Eliminated insecure client-side model overrides. The backend now strictly enforces Orchestrator settings, making it impossible for the frontend to bypass cost or logic controls.
- **Ledger & Economy Integrity (Completed Today):**
    - **Database Schema Migration:** Successfully resolved a critical database synchronization issue by implementing an automated migration for the `updated_at` column in the `wallets` table.
    - **Transaction Maintenance:** Synchronized all financial logic to ensure high-precision timestamping (CURRENT_TIMESTAMP) across all wallet credit/debit operations.
    - **Economy Activation:** Fully enabled and stress-tested the "Pay-with-Balance" 1-click execution system for premium subscriptions.
- **Subscription Precision & Database Sovereignty (Completed Today):**
    - **High-Precision Subscription Billing**: Implemented a centralized pricing engine (`calculatePlanPrice`) ensuring absolute mathematical accuracy between monthly, annual, and discounted rates.
    - **Dynamic Admin Plan Management**: Re-engineered the Admin Dashboard plan editor with real-time reactive calculations. Changing a discount now auto-calculates the annual price, and setting a custom annual price auto-derives the implied discount percentage.
    - **Resilient Database Restoration**: Hardened the restoration engine with dynamic table existence verification, session-level trigger suppression, and high-precision ID sequence synchronization.
    - **Dynamic Database Export**: Refactored backup logic to perform full-schema table discovery, ensuring comprehensive backups that adapt to schema evolutions.
    - **Subscription UI Synchronization**: Optimized the frontend toggle to dynamically reflect the actual maximum available savings across all active plans.
- **Sovereign Systems Stability (Completed Today):**
    - **Orchestrator Column Synchronization:** Resolved a critical schema mismatch between the frontend and backend. Synchronized field names (`fallback_1_provider` etc.) across `AdminDashboard.tsx` and `admin.ts` routes, ensuring AI tool configurations are persisted correctly.
    - **High-Precision Model Path Resolution:** Hardened `ai.ts` to automatically handle Gemini model path formation. The system now injects `models/` prefixes dynamically, eradicating `404 (Not Found)` errors during API calls.
    - **Robust Provider Mapping:** Refactored provider identification logic to be whitespace-agnostic and case-insensitive, ensuring that human-entered data in the Admin Panel doesn't break the routing engine.
    - **Reactive Tool Activation:** Enhanced the `handleSave` logic in the Admin Dashboard to prevent race conditions during rapid state toggling, ensuring the "Active" status of tools is accurately reflected across the system.
    - **Backend Logic Refinement:** Fixed structural nesting errors in the AI service provider checks, ensuring clean execution paths for Google, Anthropic, and OpenAI providers.
- **Sovereign Intelligence Hardening (May 10-11, 2026):**
    - **Intelligence Analyst Mode:** Implemented a localized, high-authority reinforcement protocol (`analysisReinforcement`) for the `perplexta_analysis` tool.
    - **Multimodal Sensory Activation:** Deployed "Sovereign Visual & Audio Sense" using Gemini 1.5 Flash. All uploaded media (Images, Video, Audio) is forensicly analyzed with pre-ingestion extraction for primary models.
    - **Advanced File Support:** Integrated `html-to-text` and expanded support for HTML, RTF, JSON, and complex spreadsheets.
- **Financial Sovereignty & High-Precision Monitoring (Completed Today):**
    - **Finance Radar Refactoring:** Surgical overhaul of the `AdminDashboard` and its backend foundation. Re-engineered the financial monitoring system to support structured data (Stats + Transactions Registry), resolving critical dashboard crashes.
    - **Cross-Pool Integrity:** Eradicated insecure cross-pool database joins in the backend. Implemented separate user mapping logic for ledger transactions, ensuring audit logs and diagnostic views remain accurate even across isolated database environments.
    - **Wallet Diagnostics:** Enhanced auditing tools to automatically resolve user names and emails for orphaned or negative-balance wallets.
- **Real-time Identity & Profile Synchronization (Completed Today):**
    - **Socket-Driven Profile Updates:** Engineered a global `user_profile_updated` event listener. Real-time broadcasts now trigger a forced background refresh of the user's local state upon any profile change or subscription activation.
    - **Unified Payload Sovereignty:** Standardized the return of full user profiles (including detailed subscription plans, colors, and limits) across all authentication routes (Signup, Login, OAuth, and `/me`), eradicating initial-state ambiguity.
    - **Usage Synchronization:** Linked `UsageRadar` and sidebar indicators to the real-time update engine for instantaneous tool-usage feedback.
- **Tool Logic Restoration (Completed Today):**
    - **Smart Audio Studio Restoration:** Re-restored naming sovereignty for the "Smart Audio Studio" tool (`استوديو الصوت الذكي`). Updated all translation keys and `ChatPage` logic (switching from creative to music-centric icons and banners) to honor the tool's specialized identity.
- **System Hardening & PWA Integrity (Completed Today):**
    - **Manifest Sovereignty:** Fixed critical PWA `manifest.json` syntax errors by deploying a forensically clean manifest in the `/public` directory.
    - **Real-time Usage Tracking:** Fully integrated `UsageRadar` with the Socket.io lifecycle for zero-latency monitoring.
- **Status:** **STABLE / FINANCIAL SOVEREIGNTY SECURED**.

## 9. Full-Stack Integration Roadmap (Active Phase)

### 🛡️ Phase 1: Security & Core Settings (Completed)
- [x] API Keys Vault & AES-256 sync.
- [x] System Settings Configuration & UI.
- [x] Sovereign Global Edition AI Operational Constitution embedded in Backend.
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

### 🛠️ Phase 7: Local Infrastructure & Environment Prep (Active Phase)
- [ ] Local Server Initialization & Database Mesh check.
- [ ] .env.example refinement for production-ready local builds.
- [ ] Audit of redundant files and root cleanup (Zero-Clutter Policy).

### 🧹 Phase 8: Strategic Code Audit & Optimization (Completed Today)
- [x] Systematic cleanup of all code blocks (Removing redundant comments/explanations).
- [x] Forensic review of every module for logic efficiency.
- [x] Eradication of legacy test files and structural noise.
- [x] High-precision synchronization of subscription billing across all layers.

## 10. Master Developer Protocol (Architectural Sovereignty)
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
- **Sovereignty Mandate:** Any developer (Human or AI) who introduces a hardcoded model name into the source code is committing a "Core Protocol Breach." Configuration must reside in the Database; implementation must reside in the logic.

### 10.4. Dual-System Prompt Integrity
- **Directive:** Never mix "Identity" with "Task Instructions" in a single block. 
- **Protocol:** The `CORE_PROTOCOL` defines *who* the AI is. The `task_description` (fetched from DB) defines *how* the tool should technically perform. Any update that weakens this separation is a breach of the "Elite" analysis standard.

### 10.5. Visual Sovereignty Execution
- **Directive:** UI updates must honor the established Monochrome/Emerald design system without exception. Verify sub-pixel alignment, transition durations, and "Elite" aesthetic consistency.

### 10.6. The "Update, Never Override" Mandate (Supreme Law)
- **Directive:** Every engineer or AI system that touches this repository after the current session MUST respect the precise engineering architecture currently in place.
- **Protocol:** Any new development **MUST BE AN UPDATE** and an augmentation, **NEVER A CHANGE OR REWRITE** of the core architecture. The foundations (Express/Vite, Dual DB, Orchestrator, Constitution, and Socket execution) are permanent baselines.

### 10.7. Strict Engineering Discipline
- **Directive:** All Lucide icons MUST be cloned with explicit property interfaces: `<{ size?: number; className?: string }>`. 
- **Directive:** NEVER introduce duplicate `className` attributes. All styles must be merged into a single utility block.
- **Directive:** The backend MUST NOT assume default models. If no configuration exists in the database, the system MUST return a controlled error rather than leaking hardcoded defaults.

### 10.8. SUPREME SOVEREIGN DECREE (Military Grade - Non-Negotiable) 🛡️
🚫 **ABSOLUTE PROHIBITION OF HARDCODING & ARCHITECTURAL BYPASS** 🚫

- **The Red Line:** Any attempt to bypass the **tool_orchestrator** or the **api_keys_vault** via hardcoded models, providers, or local secret strings is a catastrophic breach of project sovereignty.
- **Dynamic Purity:** The system is architected as a "Technical Orchestra" governed by the Database. Implementation logic must remain 100% agnostic. If you need a new model, add it to the DB; **NEVER** write its name in a `.ts` file.
- **Foundational Immunity:** The core foundations (Express/Vite, Dual DB Segregation, Cron Maintenance, and Socket streaming) are permanent and sovereign. Any future development **MUST** be an augmentation (Update) that strengthens these layers. **CHANGING, REWRITING, OR OVERRIDING** the core architecture is strictly forbidden and will be treated as systemic sabotage.
- **COMMANDER'S VETO (The Sovereign Command):** Any proposed modification to the core engineering or architectural foundations **REQUIRES EXPLICIT PERMISSION** from the Sovereign (The User). Before any such change is even considered, the developer (AI or Human) MUST present a rigorous justification detailing:
    1. **The Objective Reason:** Why is the current architecture insufficient?
    2. **The Expected Result:** What technical outcome will this change produce?
    3. **The Risk Audit:** How will this affect existing dual-database integrity and silent failover protocols?
- **Elite Performance Protocol:** All updates must undergo sub-pixel alignment checks and "Emerald Glow" consistency reviews. We build for the "Elite" standard; anything less is a protocol violation.

### 10.9. Code Isolation Protocol (Pure Execution)
- **Directive:** It is REFUTABLE and FORBIDDEN to write inline explanations, narrative comments, or documentation blocks inside the source code files. 
- **Reasoning:** To eliminate structural weight, prevent build-system conflicts, and ensure that the code remains a pure execution engine without legacy narrative noise. Documentation resides in the `AGENTS.md` and Database; the code remains silent and functional.

### 10.10. Pre-Flight Manifest Review (The Daily Ritual)
- **Directive:** Every developer or AI agent MUST, as an absolute prerequisite to starting any work session, review the **Global Constitution**, the **Sovereign Laws (Section 10)**, and the **Current Project Status (Section 11)**.
- **Protocol:** "Code first, read later" is a terminal violation. Understanding the mission and the architectural boundaries is the first step of every technical interaction.

## 12. Daily Execution Plan (May 12, 2026) - Architectural Transition Audit

Following the strategic split of `server.ts` into a modular architecture, today is dedicated to ensuring absolute system synchronization and precision.

### 📋 Phase 1: Post-Split Validation (Completed)
1. **Validation of API Routings & Imports Integrity**: Ensure all split routes are correctly imported and attached in `app.ts`. [COMPLETED]
2. **Database & Middleware Synchronization**: Verify consistency of shared utilities (db pool, auth middleware) across all service layers. [COMPLETED]
3. **Circular Dependency & Logic Audit**: Forensic review to prevent import loops between services and routes. [COMPLETED]
4. **Service-Route Mapping Precision**: Verify that every route correctly invokes its dedicated service with strict error handling. [COMPLETED]
5. **Real-time Engine Consistency (Socket.io)**: Ensure the split logic doesn't break the unified Socket.io lifecycle. [COMPLETED]
6. **Codebase Sanitization (Zero-Clutter)**: Purge any vestigial code from the root `server.ts` or temporary backup files. [COMPLETED]

### 📋 Phase 2: Improvement Action Plan (Active Phase)
1. **تدقيق تكامل المسارات مع الخدمات (Route-Service Decoupling)**: Refactored core routes (Chats, Users, Files, Subscriptions, Wallets) into dedicated service abstractions. [COMPLETED]
2. **توحيد نظام الاستجابة والأخطاء (Standardized Response Envelope)**: Implemented `globalErrorHandler` middleware for unified JSON error responses across all API endpoints. [COMPLETED]
3. **فحص تناسق الأرصدة والعمليات (Transactional Integrity Audit)**: Implemented atomic wallet operations with compensating refund logic in subscription workflows to handle cross-DB failures. [COMPLETED]
4. **التدقيق الأمني على صلاحيات المسؤول (Admin Security Hardening)**: Verified real-time DB-backed role validation in `authenticateAdmin` middleware. [COMPLETED]
5. **تحسين تسلسل الإقلاع (Optimized Boot Sequence)**: Hardened `initializeSovereignPools` to strictly await connectivity pings before allowing system boot. [COMPLETED]
6. **توثيق الروابط الديناميكية (Dynamic Migration Mapping)**: Verified defensive schema mapping logic (`ensureColumn`) and automated connection string protection. [COMPLETED]
7. **تحسين أداء المقبس (Socket.io Context Optimization)**: Consolidated socket lifecycle events and context propagation within service layers. [COMPLETED]

### 💡 Recommendations & Next Steps:
- **Service Logic Consolidation**: Move remaining inline AI logic (e.g., chat title generation in `routes/chat.ts`) into the `services/chat.ts` layer.
- **Enhanced Error Boundaries**: Implement a global error-handling middleware specifically for API routes to standardize responses.
- **Type Safety Hardening**: Expand shared interfaces in a central `types` directory for cross-module consistency.
- **Frontend Sync**: Verify that the new modular backend endpoints are perfectly consumed by the React frontend without regression.

---

## 11. Project Status & Final Architectural Decree (May 6, 2026)

### 🗓️ Project Status: MISSION SUCCESS - Build Succeeded
The platform has officially cleared all technical hurdles. The application builds successfully, and all core services are operational on the production server. The "Professional Elite" standard has been fully realized.

### 🚀 Final Achievements (The "Intelligence & Performance" Surge)
- **Granular Quota Sovereignty (Completed):**
    - **Precision Enforcement:** Developed a multi-dimensional quota engine that tracks daily and monthly usage per tool.
    - **High-Conversion Error UI:** Integrated a professional "Quota Exceeded" card within the chat flow, leveraging "Emerald Glow" design and psychological triggers (Upgrade/Referral) to turn friction into growth opportunities.
- **Memory & Feedback Sovereignty (Completed):**
    - **Neural Distillation Protocol:** Engineered the platform's first autonomous memory optimization layer. Facts are now synthesized dynamically to prevent context overflow while preserving the "Professional Elite" historical depth.
    - **RLHF Implementation:** Deployed a seamless Thumbs Up/Down feedback bar with "Emerald Glow" and "Amber Warmth" logic. This data is now indexed in the core database for performance auditing.
    - **Proactive Maintenance:** Deployed the global memory consolidation cron job, ensuring infinite scalability of user profile context without database performance degradation.
- **Visual Intelligence Ecosystem (Image & Video Toolbars):**
    - **High-Precision UI Calibration:** Achieved a world-class mobile interface for image and video generation tools.
    - **Mobile Optimization:** Eradicated redundant scrollbars and internal clutter. Toolbar layouts are now strictly aligned with the command input field's width for professional vertical parallelism.
    - **Typography Engineering:** Calibrated font sizes (7px-9px) and spacing to ensure maximum legibility within a high-density, technical environment on handheld devices.
- **Mobile OAuth Sovereign Fix:** Eradicated the login failure on mobile devices.
- **PWA UI Lifecycle Resilience:** Refactored the `AppContext` to handle tokens and socket initialization in a safe, non-blocking sequence. This resolved critical `ReferenceError` crashes and ensured the app is "Install-Ready" on both iOS and Android.
- **Codebase Sanitization:** Conducted a total purge of logic conflicts. Fixed variable scoping issues (socket, isInstallable) and optimized shared authentication success handlers to prevent duplicate toasts and state loops.
- **Visual Sovereignty Finalized:** Cleaned up the mobile "Suggestions" UI and PWA install banners, ensuring they only appear in the correct device context for a seamless, distraction-free experience.
- **Server-Side Redirect Integrity:** Hardened the Express backend's callback logic to dynamically derive the environment URL, ensuring that OAuth redirects land with 100% precision regardless of the domain configuration.

### 🛡️ THE SUPREME MANDATE (Final Warning)
**The Project Foundation is now SEALED.** 

1. **Architecture is Immutable:** The Express/Vite full-stack core, the Dual DB Mesh, the Socket.io generation engine, and the "Silent Failover" Orchestrator are established as the permanent BASELINE.
2. **Add, Never Rewrite:** All future development MUST be additive. New features, tools, or integrations must be modular extensions. **ANY ATTEMPT TO REWRITE OR OVERRIDE** these core modules is a violation of the "Sovereign Engineering Standard" and will result in immediate disqualification of the update.
3. **Identity Preservation:** The Arabic/English bilingual support and the Monochrome/Emerald design system must be maintained in every new component. Any deviation from the "Elite" aesthetic is considered structural noise.

---
**System State:** `STABLE / MULTIMODAL INTELLIGENCE ACTIVATED`
**Final Authorization:** All core protocols are now active and enforced by the Global Constitution.
**Sovereignty Status:** `ABSOLUTE`
**Current Session Focus:** `Media Analysis Sovereignty & Forensic Extraction`

**Final Message to All Future Contributors:** You are inheriting a "Technical Fortress." Your duty is to expand its borders, not weaken its walls. Build with precision. 🛡️✨🏆
