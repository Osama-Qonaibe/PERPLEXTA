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

### 1. نظام قواعد البيانات الرباعي المعزول | Multi-Database Architecture & Isolation Strategy
Perplexta Platform utilizes a highly secure, advanced **Four-Pool Database Architecture (Multi-Tenant Segregation)**. This decouples system responsibilities to ensure maximum database integrity, ultra-low transactional latency, flawless GDPR/KYC data handling, and defense-in-depth isolation.

تعتمد المنصة على بنية تحتية هندسية متطورة تتكون من **أربعة أحواض قواعد بيانات معزولة ومستقلة (Database Pools)**. يضمن هذا الفصل الهيكلي تلبية أعلى معايير الأمان المالي، تحقيق أداء فائق السرعة للمعالجة المتزامنة (Zero-Latency Async)، وضمان المتانة الأمنية للمنصة ضد أي اختراقات أو عثرات تشغيلية.

---

## 📊 دليل تفصيلي لقواعد البيانات والربط الهيكلي | Comprehensive Database Schema & Segregation Report

```
                      ┌─────────────────────────────────────────┐
                      │    EXPRESS BACKEND GATEWAY CONNECTOR    │
                      └─────────────────────────────────────────┘
                                   │    │    │    │
         ┌─────────────────────────┘    │    │    └─────────────────────────┐
         ▼                              ▼    ▼                              ▼
┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
│     Core Pool     │    │    Ledger Pool    │    │   External Pool   │    │   Security Pool   │
│   (Operational)   │    │    (The Vault)    │    │  (Social/Market)  │    │ (Audit & Defense) │
└───────────────────┘    └───────────────────┘    └───────────────────┘    └───────────────────┘
```

### 🗄️ 1. قاعدة البيانات التشغيلية والأساسية (Core Pool - `DATABASE_URL`)
* **الهدف الهيكلي (Architecture Role):** إدارة الهوية العامة للمستخدمين، وتدفق محادثات الذكاء الاصطناعي، والملفات، الإشعارات، وتهيئات المحرك الأساسية (Orchestrator).
* **معايير الأمان والأداء:** اتصال سريع بزمن استجابة منخفض جداً لإتاحة البث الفوري للمحادثات (Fast Chat Streaming) ومعالجة الملفات المرفقة بكفاءة.

| اسم الجدول | الوظيفة الفنية والدقيقة للجدول | Key Columns & Technical Role |
| :--- | :--- | :--- |
| `users` | يخزن بيانات الهوية، الرتب والمستويات التشغيلية، وحالة الـ KYC، وضبط واجهة المستخدم واللغة الافتراضية. | `id`, `email`, `password_hash`, `role`, `language`, `theme`, `kyc_status` |
| `chats` | يربط كل جلسة محادثة بالمستخدم مع تحديد نموذج الذكاء الاصطناعي النشط. | `id`, `user_id`, `title`, `active_model`, `updated_at` |
| `messages` | المستودع الحقيقي لنصوص الرسائل المُرسلة والمُستقبلة مع تفاصيل استهلاك الـ Tokens وعداد الصرف. | `id`, `chat_id`, `role`, `content`, `tokens_used`, `tracking_metadata` |
| `user_files` | نظام ملفات مستخدم آمن لتسجيل المرفقات المستخلصة من PDF بنظام التشفير، وحفظ النصوص المنتزعة كبيانات سياقية. | `id`, `user_id`, `filename`, `file_size`, `extracted_text`, `created_at` |
| `tool_orchestrator` | لوحة التحكم الذكية لتوجيه نماذج الذكاء الاصطناعي الأساسية والاحتياطية لكل أداة (Silent Failover). | `id`, `tool_id`, `primary_model`, `fallback_1_model`, `fallback_2_model` |
| `api_keys_vault` | قبو مشفر بمستوى عسكري (AES-256) يحفظ مفاتيح مزودي الذكاء الاصطناعي دون أي تسريب في السيرفر. | `id`, `provider`, `encrypted_key_data`, `is_active` |
| `system_settings` | خصائص الموقع الثنائية اللغة (AR/EN)، بيانات السيو (SEO)، وإعدادات بوابة الدفع وتصاريح تشغيل خادم المزامنة. | `id`, `site_name`, `site_name_ar`, `seo_description`, `stripe_webhook_secret` |
| `system_broadcasts` | الإعلانات الإدارية والبث الحي للمستخدين النشطين في واجهة التشغيل. | `id`, `title_en`, `title_ar`, `content_en`, `content_ar` |
| `support_tickets` | بطاقات الفحص والدعم الفني ومراحل معالجة وحل إشكاليات المستخدم النهائي. | `id`, `user_id`, `subject`, `status` (Open/Closed), `priority` |

---

### 💳 2. محفظة الدفتر المالي المعزولة (Ledger Pool - `LEDGER_DATABASE_URL`)
* **الهدف الهيكلي (Architecture Role):** عزل متكامل لكافة العمليات المالية، والاشتراكات، والعمولات، ونظام شجرة الإحالات (Referral Tree) بنمط سجل الصياغة التراكمي (Append-Only Ledger).
* **معايير الأمان والأداء:** لا توجد عمليات حذف أو تعديل للقيم بشكل مباشر لحماية الحسابات من أي التواء مالي أو هجوم تزوير. كافة العمليات المالية هي عبارة عن حركات حسابية متوازنة لضمان المحاسبة العادلة (Audit Trail).

| اسم الجدول | الوظيفة الفنية والدقيقة للجدول | Key Columns & Technical Role |
| :--- | :--- | :--- |
| `wallets` | السجل الموحد لرصيد المحفظة الفعلي والترويجي لكل عميل (يتم تحديثه فقط عبر حركات الدفتر التراكمي). | `id`, `user_id`, `balance`, `promo_balance`, `updated_at` |
| `ledger_transactions` | الدفتر العام التراكمي: حركة حسابية دقيقة لتتبع الإيداع، الخصم، شراء الخدمات، والعمولات المسجلة زمنياً. | `id`, `wallet_id`, `amount`, `type` (Credit/Debit), `description`, `reference_id` |
| `subscriptions` | اشتراكات المستخدمين الحالية، والمستوى البلاتيني/الذهبي، وفترة الانتهاء، وضوابط الاستهلاك المستهدف. | `id`, `user_id`, `plan_id`, `status` (Active/Canceled), `current_period_end` |
| `plans` | قوالب الحزم التشغيلية المخصصة بما في ذلك عتبة حدود الحسابات الخاصة بكل أداة وقيم الاشتراك السنوي/الشهري. | `id`, `name`, `price_monthly`, `price_yearly`, `tool_quotas_json` |
| `referrals` | شجرة المبتدئين والعوائد الإحالية (Referral Tree)، توثيق عمليات الشراء وحساب حصص الشركاء والمشرفين. | `id`, `referrer_id`, `referred_id`, `points_rewarded`, `payout_status` |
| `deposits` | سجلات طلبات الشحن اليدوية والآلية وبوابات الدفع البنكية والمشفرة قبل الاعتماد وإدراج الحركات بالدفتر المالي. | `id`, `user_id`, `amount`, `gateway`, `status` (Pending/Approved/Rejected) |
| `coupons` | نظام الخصومات الترويجية والقسائم المحددة بنطاق عوائد ومستويات مالية ترويجية. | `id`, `code`, `discount_percent`, `max_uses`, `expires_at` |

---

### 🌐 3. قاعدة البيانات الخارجية والمجتمعية (External Pool - `EXTERNAL_DATABASE_URL`)
* **الهدف الهيكلي (Architecture Role):** السيطرة الكاملة على منتديات النقاش، والمقالات وبلوج التحليل المتقدم، وبوابة المتجر المتكامل في المنصة (Marketplace).
* **معايير الأمان والأداء:** تسمح بالاستعلامات الضخمة للمنتديات والمشاركة المجتمعية بدون التأثير على قاعدة محركات المحادثات أو البيانات المالية.

| اسم الجدول | الوظيفة الفنية والدقيقة للجدول | Key Columns & Technical Role |
| :--- | :--- | :--- |
| `forum_categories` | تصنيفات وأقسام منتدى المجتمع الفني والمالي مع الأيقونات المرتبطة والصفات اللونية. | `id`, `name_en`, `name_ar`, `color`, `slug` |
| `forum_posts` | مواضيع النقاش المفتوحة ومقاود الترشيح ومواصفات الإشراف والحظر. | `id`, `category_id`, `user_id`, `title`, `content`, `views_count`, `is_locked` |
| `forum_comments` | الردود الفنية على مواضيع المنتدى الداعمة لتنسيق غني وتتبع الاستشهادات. | `id`, `post_id`, `user_id`, `content` |
| `blog_articles` | مقالات التحليل المالي والتقني الاحترافية المكتوبة بأقلام النخبة أو المعتمدة تشغيلياً. | `id`, `title_en`, `title_ar`, `content_en`, `content_ar`, `author_id`, `tags` |
| `marketplace_items` | الأدوات ومنتجات المحاكاة المتاحة في المتجر مع ضبط الأسعار ومعدل الإحالة المجتمعي. | `id`, `title`, `description`, `price`, `file_path` (Secure S3 or Direct), `referral_percent` |
| `marketplace_purchases` | الفواتير التقنية لتثبيت المبيعات وتأمين المرفقات والتحقق من التوقيع الرقمي للمالك. | `id`, `item_id`, `buyer_id`, `price_paid`, `is_claimed` |

---

### 🛡️ 4. حوض الحماية وأمن السيرفر (Security Pool - `SECURITY_DATABASE_URL`)
* **الهدف الهيكلي (Architecture Role):** مراقبة نشاط التطبيق، وتتبع الجلسات المتعددة، وتقييد معدلات الطلب الآلي، والتحصينات الدفاعية لمنع هجمات الاستغلال.
* **معايير الأمان والأداء:** حماية عالية المستوى تفحص كافة الرموز (Tokens) ومصدر عناوين الـ IP قبل تفعيل خدمات المحادثة أو المعاملات البنكية لسرعة اتخاذ القرارات الأمنية.

| اسم الجدول | الوظيفة الفنية والدقيقة للجدول | Key Columns & Technical Role |
| :--- | :--- | :--- |
| `user_sessions` | تتبع بصمات الجسلات والـ IP النشط والموقع الجغرافي المسجل لكل جلسة مستخدم لضمان عدم السخرة العابرة للحدود. | `id`, `user_id`, `ip_address`, `user_agent`, `platform`, `is_active` |
| `token_blacklist` | سلة حجز الرموز التالفة والملغاة (Revoked Tokens) لعمليات المصادقة لإنهاء الجلسات فور الخروج الآمن. | `id`, `token`, `expires_at`, `blacklisted_at` |
| `security_alerts` | سجلات الحوادث الاستخباراتية للأمن (IDS): تتبع محاولات الولوج الخاطئ، فحص انتهاك هجمات الحقن أو تجاوز الحدود. | `id`, `user_id`, `alert_type`, `severity` (Low/Med/High), `details`, `ip_address` |
| `password_resets` | الرموز الآمنة وذات المدة القصيرة المخصصة لتغيير وارتجاع بيانات تسجيل الدخول للمستخدمين الفاقدين للوصول. | `id`, `user_id`, `token`, `expires_at` |

---

### 🏁 3. محرك التوجيه الذاتي الصامت | Silent Failover Orchestrator

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
