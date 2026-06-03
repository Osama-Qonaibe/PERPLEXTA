# 🌌 Perplexta Platform - Elite AI System & Dual-Database Orchestrator

[![Architecture: Full-Stack React 19 + Express](https://img.shields.io/badge/Architecture-Full--Stack%20React%2019%20%2B%20Express-emerald?style=flat-square)](https://github.com)
[![Database: PostgreSQL Dynamic Quad-Pool](https://img.shields.io/badge/Database-PostgreSQL%20Quad--Pool-blue?style=flat-square)](https://github.com)
[![Protocol: Agentic Commerce Protocol (ACP)](https://img.shields.io/badge/Protocol-ACP%20Discovery-orange?style=flat-square)](https://github.com)
[![Protocol: Model Context Protocol (MCP)](https://img.shields.io/badge/Protocol-MCP%20Integration-0052cc?style=flat-square)](https://github.com)
[![Stability: Verified Stable](https://img.shields.io/badge/Stability-Verified%20Stable-2ecc71?style=flat-square)](https://github.com)

---

## 📖 Platform Vision & Identity

**Perplexta Platform** is an enterprise-grade full-stack AI execution, programmatic workspace, and financial ledger platform built for **Professional Elite Technical Analysis**. It integrates native real-time AI streams, bulletproof multi-model failovers, sandbox file intelligence, and a strict, append-only cash ledger system within an aesthetic, zero-friction interface.

Designed under a unified design philosophy, Perplexta couples lightweight responsive frontends with hardened backend architectures, supporting both general technical consumers and high-throughput programmatic machine/agent clients.

---

## 🏗️ System Architecture & Data Flow

```
                                    [ Client UI - React 19 ]
                                               │
                                     ( Socket.io & REST )
                                               │
                                               ▼
                               [ Express API & Security Gateway ]
                      ┌────────────────────────┼────────────────────────┐
                      ▼                        ▼                        ▼
          [ Core DB (Operational) ]  [ Ledger DB (The Vault) ]  [ External & Community ]
          - Profiles & Auths         - Append-Only Transactions - Forum & Marketplace
          - Orchestrator Engine      - Partner Referral Tree    - Professional Blogs
          - Secure File Vaults       - Stripe Subscriptions     - Community Purchases
```

### HARDENED QUAD-POOL DATABASE INFRASTRUCTURE
To guarantee defense-in-depth security, strict transactional isolation, and sub-millisecond queries, the backend controls **Four Geographically Isolated Database Pools** (Core Operational, Financial Ledger, External Social/Market, and Security Audit/Defense). Direct structural joins between critical transactional entities (like balances or wallets) and social/operational schemas are architecturally banned at the query level.

---

## 🤖 Advanced AI Agent Capabilities & Integrations

Perplexta Platform is engineered with comprehensive, machine-readable specifications allowing programmatic AI agents, developer networks, and autonomous nodes to seamlessly discover, map, authorize, and invoke its services.

```
       [ Client AI Agent ]  ───────── 1. Query Link Headers ─────────► [ Origin Root (/) ]
                │                                                           │
                │◄───────── 2. RFC 9727 / RFC 8288 Discovery ───────────────┘
                │
                ├────────── 3. Find MCP Capabilities ───────────────────────► [ /.well-known/mcp/server-card.json ]
                ├────────── 4. Find Commerce Specifications ────────────────► [ /.well-known/acp.json ]
                └────────── 5. Register & Trade Node (x402 Protocol) ───────► [ /api/auth/register-agent ]
```

---

### 1. Agentic Commerce Protocol (ACP) Discovery Interface
To allow programmatic AI agents to automatically discover commerce capabilities without requiring human interactive signup, the platform serves a verified, fully-compliant ACP Discovery document at its origin root:

* **Endpoint Location:** `/.well-known/acp.json` (HTTP Status 200, public, with optimal CORS configuration supporting browser-less agent queries).
* **Bilingual Navigation Hooks:** The system serves unified RFC 8288 & RFC 9727 reactive Link headers on all origin requests targeting `/` or `/index.html`:
  ```http
  Link: </.well-known/api-catalog>; rel="api-catalog", </.well-known/mcp/server-card.json>; rel="service-desc", </.well-known/acp.json>; rel="acp"
  ```
* **Discovery Schema:** Returns compliance configuration targeting protocol versioning, dynamic fallback URLs, supported network transports, and available agent checkout services:
  ```json
  {
    "protocol": {
      "name": "acp",
      "version": "1.0"
    },
    "api_base_url": "https://perplexta-platform-host/api",
    "transports": ["http"],
    "capabilities": {
      "services": ["checkout"]
    }
  }
  ```

---

### 2. Model Context Protocol (MCP) Integration
To facilitate immediate context injection and system instrumentation, Perplexta implements host-level MCP protocol compliance:
* **Service Descriptor:** Served dynamically at `/.well-known/mcp/server-card.json`.
* **Standard Representation:** Programmatic clients use this catalog to instantly read and map available analytic tools (such as Sovereign Research, Canvas Audio Studio, and Perplexta Analysis), their pricing weights, and arguments schema.
* **Stream Compatibility:** Directly links model prompts to the background execution layer, streamlining autonomous research loops.

---

### 3. Programmatic API Keys & Wallet Linkage (x402 Payment Architecture)
Designed for high-performance machine clients, developers can dynamically generate runtime API credentials and register programmatic agents. Registration processes hook directly into the financial ledger system via the **x402 Programmatic Payment Protocol**:

```
[ Developer Agent Node ] ─────── ( Request /register-agent ) ───────► [ API & Wallet Link Router ]
           ▲                                                                      │
           │                                                            1. Verify x402 cost in DB
           │                                                            2. Check User Core Wallet
           │                                                                      │
           ├─── [ Account Rejection (HTTP 402) ] ◄── Balance < x402 cost ─────────┤
           │                                                                      ▼
           └─── [ Keys Registered & Ledger Booked ] ◄── Balance ≥ x402 cost ──────┘
```

* **Automated Key Debits:** Creating programmatic credentials (`registered_agents` portal) queries the current transaction cost of the high-fidelity gateway (`x402_api`) directly from the backend `tool_orchestrator` table.
* **Ledger Synchronization:** The gateway executes a real-time, isolated append-only debit on the user's operational wallet balance (recording a corresponding transaction hash within `ledger_transactions` to preserve compliance records).
* **Default Pricing:** Programmatic registration queries are dynamically populated from administrative tool controls, defaulting to a safe, audited pricing baseline of **₪5.00** per registration cycle if left unmodified in the admin control cards.
* **Sovereign Quota Control:** If wallet levels are insufficient to settle the registration fee, the backend immediately halts the credential creation flow and rejects the transaction by serving a standardized **HTTP 402 Use Balance / Insufficient Funds** payload with localized Arabic-English recovery paths:
  ```json
  {
    "error": "Insufficient Balance",
    "message": "Dynamic key creation requires ₪5.00. Please recharge your account balance."
  }
  ```

---

## 🎯 Full-Stack System Features & Resilience Controls

### 🌀 1. Silent Failover AI Orchestration
* **Runtime Abstraction:** No model names, configurations, or direct provider paths are hardcoded in application logic.
* **Database-Driven Routing:** Active AI tools correspond to hierarchical parameters designating a **Primary Model**, **Fallback 1**, and **Fallback 2**.
* **Automatic Silent Handoffs:** If the primary engine encounters HTTP rate limits, quota failures, or service timeouts, the orchestrator silently captures the exception, clones the prompt context, and routes queries to the fallback handler in under 40ms, providing uninterrupted user output streaming.

### 💼 2. Segmented Subscription Ecosystem
To balance consumer workloads with resource-intensive enterprise machine developers, Perplexta deploys segmented tier selections:
* **Performance Plans (Consumer UI):** Highly optimized tiers tailored for human interactive research, chats, and audio synthesis (e.g., `Starter`, `Pro`, `Elite`).
* **Developer & Agent Plans (Programmatic Integration):** Built for machines and technical developers (e.g., `Developer Lite`, `Developer Scale`). These plans focus entirely on raw endpoints, OIDC OAuth credentials, and **x402 API query quotas**.
* **Adaptive Panels:** Frontend subscription pages dynamically swap conversational limit meters (such as message ceilings or search parameters) with programmatic meters (`x402 API Requests` and high-capacity secure storage quotas) based on active plan categories.

### 📂 3. 100MB Intelligence Sandboxing & Analysis
* **High-Capacity Ingestion:** Secure physical upload and schema-vetted reading of documents, spreadsheets, code, and PDFs up to **100MB**.
* **Extraction Bridge:** Extracted textual contexts are compiled on-the-fly and seamlessly structured inside agent system prompts during inference, turning documents into instantly querying vectors.

---

## 🗄️ Database Schema & Segmentation Report

A complete database structure and relationships index is mapped in depth across our core database registries:

* **Operational Core Pool (`DATABASE_URL`):** Manages users, credentials, chats, messages, administrative settings, and tool orchestration routes.
* **Financial Ledger Pool (`LEDGER_DATABASE_URL`):** Strict, append-only financial registry managing balances, deposits, stripes, referrals, coupons, and API plan parameters.
* **External Social Pool (`EXTERNAL_DATABASE_URL`):** Moderated community spaces, forums, partner technical blogs, and the asset marketplace.
* **Security Audit Pool (`SECURITY_DATABASE_URL`):** Security session logs, rate limit structures, and Token blacklists.

*(Refer to complete table schema details inside the main developer guidelines for full primary/foreign key mappings).*

---

## 🚀 Setup & Local Installation

### Prerequisites
* **Node.js:** v18 or higher (v20+ recommended)
* **PostgreSQL:** Dual operational and ledger instances.

### 1. Configure the Local Environment
Clone the repository and compile environment settings:
```bash
cp .env.example .env
```
Ensure you provide accurate db connection URLs:
```env
DATABASE_URL=postgres://user:password@localhost:5432/perplexta_core
LEDGER_DATABASE_URL=postgres://user:password@localhost:5432/perplexta_ledger
JWT_SECRET=your_jwt_signing_secret_here
ENCRYPTION_KEY=32_character_aes_encryption_key_here
```
*(All provider keys are strictly stored on disk using AES-256 standard encryption bound to your `ENCRYPTION_KEY` block.)*

### 2. Run Local Systems
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Build & Deploy
Bundles frontend components and packages backend configurations to single, fast-executing, standalone scripts:
```bash
npm run build
npm run start
```

---

<div align="center">
  <sub>PERPLEXTA PLATFORM • Engineered with Professional Purity, Majestic Calm & Bulletproof Performance.</sub>
</div>
