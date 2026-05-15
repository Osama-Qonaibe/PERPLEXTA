# الهيكلية المقترحة — Perplexta Architecture Proposal

> مقارنة بين الهيكلية الحالية والمقترحة بعد التدقيق الشامل

---

## المقارنة السريعة

| الجانب | الحالي | المقترح |
|---|---|---|
| `AdminDashboard.tsx` | ملف واحد 427KB | 5 ملفات منفصلة |
| `server/routes/admin.ts` | ملف واحد 34KB | 5 ملفات منفصلة |
| Types | `any[]` منتشر | `/types` مخصص |
| Security | لا تشفير على حقل المفتاح | `encryptField()` layer |
| API Versioning | `/api/admin/...` | `/api/v1/admin/...` |
| Tests | غائب كلياً | `__tests__/` لكل service |
| Constants | `constants.ts` + مجلد `constants/` | مجلد واحد فقط |

---

## الهيكلية المقترحة الكاملة

```
perplexta/
│
├── 📁 server/                          ← Backend
│   ├── index.ts                        ← Entry point + Socket.IO
│   ├── app.ts                          ← Express + middleware mount
│   │
│   ├── 📁 config/
│   │   ├── database.ts                 ← DB connections (Core + Ledger)
│   │   ├── jwt.ts                      ← JWT config
│   │   └── env.ts                      ← validated env vars (zod)
│   │
│   ├── 📁 db/
│   │   ├── core/                       ← Core DB queries
│   │   └── ledger/                     ← Ledger DB queries
│   │
│   ├── 📁 middleware/
│   │   ├── auth.ts                     ← JWT verify
│   │   ├── adminOnly.ts                ← Admin guard
│   │   ├── rateLimiter.ts              ← Rate limiting
│   │   └── csrf.ts                     ← [جديد] CSRF protection
│   │
│   ├── 📁 routes/
│   │   ├── index.ts                    ← [جديد] Mount all routes with /v1
│   │   ├── auth.ts
│   │   ├── chat.ts
│   │   ├── users.ts
│   │   ├── wallet.ts
│   │   ├── payments.ts
│   │   ├── plans.ts
│   │   ├── subscriptions.ts
│   │   ├── notifications.ts
│   │   ├── memory.ts
│   │   ├── files.ts
│   │   ├── kyc.ts
│   │   ├── system.ts
│   │   ├── tools.ts
│   │   │
│   │   └── 📁 admin/                   ← [مقسّم من admin.ts الحالي]
│   │       ├── index.ts                ← Mount admin sub-routes
│   │       ├── keys.ts                 ← /admin/api-keys
│   │       ├── databases.ts            ← /admin/databases
│   │       ├── orchestrator.ts         ← /admin/orchestrator
│   │       ├── financial.ts            ← /admin/financial-radar
│   │       ├── stats.ts                ← /admin/stats + health
│   │       ├── users.ts                ← /admin/users
│   │       └── maintenance.ts          ← /admin/maintenance
│   │
│   ├── 📁 services/
│   │   ├── ai/
│   │   │   ├── orchestrator.ts         ← AI routing engine
│   │   │   ├── providers/              ← openai, anthropic, groq...
│   │   │   └── tools/                  ← chat, image, tts, stt...
│   │   ├── wallet.service.ts
│   │   ├── auth.service.ts
│   │   └── crypto.service.ts           ← [جديد] تشفير/فك تشفير المفاتيح
│   │
│   ├── 📁 types/                       ← [جديد] Server-side interfaces
│   │   ├── api.types.ts
│   │   ├── db.types.ts
│   │   └── ai.types.ts
│   │
│   ├── 📁 jobs/
│   │   ├── budgetReset.ts
│   │   └── cleanup.ts
│   │
│   ├── 📁 utils/
│   │   └── helpers.ts
│   │
│   └── 📁 __tests__/                   ← [جديد] Unit tests
│       ├── auth.test.ts
│       ├── wallet.test.ts
│       └── crypto.service.test.ts
│
│
├── 📁 src/                             ← Frontend
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── 📁 context/
│   │   └── AppContext.tsx
│   │
│   ├── 📁 types/                       ← [جديد] Shared interfaces
│   │   ├── admin.types.ts
│   │   ├── ai.types.ts
│   │   ├── wallet.types.ts
│   │   └── user.types.ts
│   │
│   ├── 📁 hooks/                       ← [جديد] Custom React hooks
│   │   ├── useAdminData.ts
│   │   ├── useApiKeys.ts
│   │   ├── useToast.ts
│   │   └── useSocket.ts
│   │
│   ├── 📁 constants/                   ← [موحّد - حذف constants.ts المفرد]
│   │   ├── motions.ts
│   │   ├── themes.ts
│   │   └── providers.ts                ← قائمة AI providers
│   │
│   ├── 📁 pages/
│   │   ├── Auth/
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── Chat/
│   │   │   └── index.tsx
│   │   └── admin/                      ← [مقسّم من AdminDashboard.tsx]
│   │       ├── AdminLayout.tsx         ← Sidebar + navigation
│   │       ├── CommandCenter.tsx       ← /admin (overview)
│   │       ├── ApiKeysVault.tsx        ← /admin/keys
│   │       ├── DatabaseOrchestration.tsx ← /admin/databases
│   │       ├── FinancialRadar.tsx      ← /admin/financial
│   │       ├── AiOrchestrator.tsx      ← /admin/orchestrator
│   │       ├── UsersManagement.tsx     ← /admin/users
│   │       └── SystemSettings.tsx      ← /admin/settings
│   │
│   ├── 📁 components/
│   │   ├── ui/                         ← [جديد] Base design system components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Toast.tsx               ← [مستخرج - موحّد من كل الصفحات]
│   │   │   ├── Modal.tsx               ← [مستخرج - SyncModal + DeleteModal]
│   │   │   └── ProgressBar.tsx
│   │   └── shared/                     ← مكونات مشتركة أعقد
│   │
│   ├── 📁 layouts/
│   ├── 📁 lib/
│   └── 📁 utils/
│
├── 📁 public/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## أبرز التغييرات المقترحة

### 1. تقسيم AdminDashboard.tsx
**الحالي:** ملف واحد 427KB يحتوي على 6 views + 3 modals
**المقترح:** كل view ملف مستقل في `src/pages/admin/`

### 2. تقسيم server/routes/admin.ts
**الحالي:** ملف واحد 34KB يحتوي على كل admin endpoints
**المقترح:** مجلد `server/routes/admin/` بـ 7 ملفات

### 3. طبقة الأمان المفقودة
**الحالي:** مفاتيح API تُحفظ مباشرة في DB
**المقترح:**
```typescript
// server/services/crypto.service.ts
import crypto from 'crypto';
const ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY!;

export function encryptField(value: string): string { ... }
export function decryptField(encrypted: string): string { ... }
```

### 4. توحيد Toast و Modal
**الحالي:** كل View ينشئ Toast و Modal خاص به (كود مكرر 6+ مرات)
**المقترح:** مكون واحد في `src/components/ui/Toast.tsx` و `Modal.tsx`

### 5. Custom Hooks
**الحالي:** fetch + state منتشر في كل مكون
**المقترح:**
```typescript
// src/hooks/useApiKeys.ts
export function useApiKeys() {
  const [providers, setProviders] = useState(...);
  const fetchKeys = async () => { ... };
  const saveKey = async (id, key) => { ... };
  return { providers, fetchKeys, saveKey };
}
```

### 6. API Versioning
**الحالي:** `/api/admin/...`
**المقترح:** `/api/v1/admin/...` عبر `server/routes/index.ts`

### 7. Types Layer
**الحالي:** `any[]` منتشر
**المقترح:**
```typescript
// src/types/admin.types.ts
export interface ApiProvider {
  id: string;
  name: string;
  status: 'active' | 'missing' | 'invalid';
  isActive: boolean;
  budget: number;
  usedToday: number;
  updatedAt: string | null;
}
```

---

## الأولوية التنفيذية المقترحة

| الأولوية | المهمة | الجهد |
|---|---|---|
| 1 | إضافة `crypto.service.ts` لتشفير المفاتيح | صغير |
| 2 | استخراج `Toast.tsx` و `Modal.tsx` موحدين | صغير |
| 3 | إنشاء `src/types/` | صغير |
| 4 | تقسيم `server/routes/admin.ts` | متوسط |
| 5 | تقسيم `AdminDashboard.tsx` إلى pages | كبير |
| 6 | إنشاء Custom Hooks | متوسط |
| 7 | إضافة API versioning `/v1/` | صغير |
| 8 | إضافة tests أساسية | متوسط |
