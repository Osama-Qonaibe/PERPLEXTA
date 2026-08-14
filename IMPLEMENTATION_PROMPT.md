# 🚀 Implementation Prompt - Complete Brand System

## ملخص سريع | Quick Summary
تحويل Perplexta من **70% ألوان مُدمجة** إلى **95% tokens دلالية** مثل GitHub Primer.

---

## المرحلة 1: الأساسات (الأسبوع الأول)
### Phase 1: Foundation (Week 1)

### ✅ الخطوة 1.1: إنشاء ملف Brand Central

**الملف**: `src/constants/brand.ts`

```typescript
/**
 * 🎨 PERPLEXTA BRAND TOKENS
 * 
 * RULE: Never import from this file in components.
 * Use semantic.ts instead.
 */

export const PRIMITIVE_TOKENS = {
  // Neutral Gray Scale
  gray: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    150: '#eaeef2',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',  // PRIMARY ACCENT
    800: '#1e293b',
    900: '#0f172a',
  },

  // Accent Colors
  accent: {
    slate: {
      light: '#94a3b8',    // Dark mode primary
      default: '#334155',  // Light mode primary
      hover: '#1e293b',
      active: '#0f172a',
    },
    emerald: {
      light: '#2ea043',
      default: '#1a7f37',  // Secondary brand
      dark: '#116329',
    },
  },

  // Status Colors
  status: {
    success: {
      light: '#3fb950',
      default: '#1a7f37',
      muted: '#dafbe1',
    },
    danger: {
      light: '#f85149',
      default: '#cf222e',
      muted: '#ffebe9',
    },
    warning: {
      light: '#d29922',
      default: '#9a6700',
      muted: '#fff8c5',
    },
    info: {
      light: '#58a6ff',
      default: '#0969da',
      muted: '#ddf4ff',
    },
  },
} as const;

export type PrimitiveTokenType = typeof PRIMITIVE_TOKENS;

/**
 * Light Mode Mappings
 */
export const LIGHT_MODE = {
  surface: {
    page: PRIMITIVE_TOKENS.gray[50],
    card: PRIMITIVE_TOKENS.gray[0],
    subtle: PRIMITIVE_TOKENS.gray[100],
    inset: PRIMITIVE_TOKENS.gray[200],
  },
  fg: {
    default: PRIMITIVE_TOKENS.gray[900],
    muted: PRIMITIVE_TOKENS.gray[600],
    disabled: PRIMITIVE_TOKENS.gray[400],
    onEmphasis: '#ffffff',
    accent: PRIMITIVE_TOKENS.accent.slate.default,
  },
  bg: {
    accent: PRIMITIVE_TOKENS.accent.slate.default,
    accentMuted: '#f1f8ff',
  },
  border: {
    default: PRIMITIVE_TOKENS.gray[300],
    accent: PRIMITIVE_TOKENS.accent.slate.default,
  },
} as const;

/**
 * Dark Mode Mappings
 */
export const DARK_MODE = {
  surface: {
    page: '#0b0b0d',
    card: '#151517',
    subtle: '#1c1c1f',
    inset: '#232326',
  },
  fg: {
    default: '#f0f6fc',
    muted: '#9198a1',
    disabled: '#656d76',
    onEmphasis: '#ffffff',
    accent: PRIMITIVE_TOKENS.accent.slate.light,
  },
  bg: {
    accent: '#64748b',
    accentMuted: 'rgba(100, 116, 139, 0.15)',
  },
  border: {
    default: '#3d444d',
    accent: '#64748b',
  },
} as const;
```

---

### ✅ الخطوة 1.2: إنشاء ملف Semantic Tokens

**الملف**: `src/constants/semantic.ts`

```typescript
/**
 * 🎯 SEMANTIC TOKENS
 * 
 * Intent-based aliases that work in both light and dark modes.
 * Use ONLY these in components, never primitives.
 */

export const SEMANTIC_COLORS = {
  // Surfaces
  surface: {
    page: 'var(--surface-page)',
    card: 'var(--surface-card)',
    subtle: 'var(--surface-subtle)',
    inset: 'var(--surface-inset)',
  },

  // Foreground (Text)
  text: {
    primary: 'var(--fg-default)',
    secondary: 'var(--fg-muted)',
    disabled: 'var(--fg-disabled)',
    onEmphasis: 'var(--fg-on-emphasis)',
    accent: 'var(--fg-accent)',
  },

  // Background
  bg: {
    primary: 'var(--bg-default)',
    secondary: 'var(--bg-muted)',
    accent: 'var(--bg-accent-emphasis)',
    accentMuted: 'var(--bg-accent-muted)',
    inset: 'var(--bg-inset)',
  },

  // Borders
  border: {
    default: 'var(--border-default)',
    muted: 'var(--border-muted)',
    accent: 'var(--border-accent-emphasis)',
  },

  // Status (Semantic)
  success: {
    fg: 'var(--fg-success)',
    bg: 'var(--bg-success-muted)',
    bgEmphasis: 'var(--bg-success-emphasis)',
  },
  danger: {
    fg: 'var(--fg-danger)',
    bg: 'var(--bg-danger-muted)',
    bgEmphasis: 'var(--bg-danger-emphasis)',
  },
  warning: {
    fg: 'var(--fg-attention)',
    bg: 'var(--bg-attention-muted)',
    bgEmphasis: 'var(--bg-attention-emphasis)',
  },
  info: {
    fg: 'var(--fg-info)',
    bg: 'var(--bg-info-muted)',
  },
} as const;

/**
 * Usage Examples:
 * 
 * ✅ CORRECT:
 * <div style={{ backgroundColor: SEMANTIC_COLORS.surface.card }}>
 * <div className="bg-[var(--surface-card)]">
 * <div className="text-[var(--fg-default)]">
 * 
 * ❌ WRONG:
 * <div className="bg-emerald-500">
 * <div className="text-gray-700">
 * <div style={{ color: '#334155' }}>
 */
```

---

### ✅ الخطوة 1.3: تحديث `src/index.css`

**تصحيح الخطأ الأساسي**: ترتيب الفونتات

```css
/* src/index.css - Line 268 */

/* ❌ CURRENT (WRONG) */
--font-sans: "Space Grotesk", "Tajawal", ui-sans-serif, system-ui, sans-serif;

/* ✅ CORRECT */
--font-sans: "Tajawal", "Space Grotesk", ui-sans-serif, system-ui, sans-serif;

--font-mono: "JetBrains Mono", "Space Grotesk", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

---

### ✅ الخطوة 1.4: تحديث `tailwind.config.js`

**الملف**: `tailwind.config.js`

```typescript
import tailwindcss from 'tailwindcss';

export default {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // ✅ Map Tailwind colors to CSS variables
      colors: {
        // Surfaces
        'surface-page': 'var(--surface-page)',
        'surface-card': 'var(--surface-card)',
        'surface-subtle': 'var(--surface-subtle)',
        'surface-inset': 'var(--surface-inset)',

        // Text/Foreground
        'fg-default': 'var(--fg-default)',
        'fg-muted': 'var(--fg-muted)',
        'fg-disabled': 'var(--fg-disabled)',
        'fg-accent': 'var(--fg-accent)',

        // Background
        'bg-primary': 'var(--bg-default)',
        'bg-secondary': 'var(--bg-muted)',
        'bg-accent': 'var(--bg-accent-emphasis)',

        // Borders
        'border-primary': 'var(--border-default)',
        'border-accent': 'var(--border-accent-emphasis)',
      },
      
      // ✅ Fix Font Family
      fontFamily: {
        sans: [
          'Tajawal',           // Arabic priority
          'Space Grotesk',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },

      // ✅ Border Radius
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
};
```

---

## المرحلة 2: مكونات الواجهة (الأسبوع الثاني)
### Phase 2: UI Components (Week 2)

### ✅ الخطوة 2.1: مكون Button الموحد

**الملف**: `src/components/ui/Button.tsx`

```typescript
import React from 'react';
import clsx from 'clsx';
import { SEMANTIC_COLORS } from '../../constants/semantic';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      className,
      children,
      isLoading,
      icon,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary: clsx(
        'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)]',
        'hover:bg-opacity-90 active:bg-opacity-80',
        'dark:bg-[#64748b] dark:hover:bg-opacity-85'
      ),
      secondary: clsx(
        'bg-[var(--bg-muted)] text-[var(--fg-default)]',
        'hover:bg-[var(--bg-overlay)] border border-[var(--border-default)]',
        'dark:bg-[#232326] dark:hover:bg-[#2c2c31]'
      ),
      danger: clsx(
        'bg-[var(--bg-danger-muted)] text-[var(--fg-danger)]',
        'hover:bg-[var(--bg-danger-emphasis)] hover:text-[var(--fg-on-emphasis)]'
      ),
      ghost: clsx(
        'bg-transparent text-[var(--fg-default)]',
        'hover:bg-[var(--bg-hover)]'
      ),
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-sm)]',
      md: 'px-4 py-2 text-sm font-semibold rounded-[var(--radius-sm)]',
      lg: 'px-6 py-3 text-base font-bold rounded-[var(--radius-md)]',
    };

    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2',
          'transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--focus-outline)] focus:ring-offset-2',
          'active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {icon && !isLoading && <span>{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

---

### ✅ الخطوة 2.2: مكون Badge

**الملف**: `src/components/ui/Badge.tsx`

```typescript
import React from 'react';
import clsx from 'clsx';

interface BadgeProps {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className,
}) => {
  const variantStyles = {
    default:
      'bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] border border-[var(--border-accent-emphasis)]/20',
    success:
      'bg-[var(--bg-success-muted)] text-[var(--fg-success)] border border-[var(--fg-success)]/20',
    danger:
      'bg-[var(--bg-danger-muted)] text-[var(--fg-danger)] border border-[var(--fg-danger)]/20',
    warning:
      'bg-[var(--bg-attention-muted)] text-[var(--fg-attention)] border border-[var(--fg-attention)]/20',
    info: 'bg-[var(--bg-info-muted)] text-[var(--fg-info)] border border-[var(--fg-info)]/20',
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs font-bold',
    md: 'px-3 py-1.5 text-sm font-bold',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-[var(--radius-full)]',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
```

---

### ✅ الخطوة 2.3: مكون Card

**الملف**: `src/components/ui/Card.tsx`

```typescript
import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'flat' | 'outlined';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', className, children, ...props }, ref) => {
    const variantStyles = {
      elevated: clsx(
        'bg-[var(--surface-card)]',
        'border border-[var(--border-default)]',
        'shadow-sm dark:shadow-black/30'
      ),
      flat: 'bg-[var(--surface-subtle)]',
      outlined: 'bg-transparent border-2 border-[var(--border-default)]',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-[var(--radius-md)] p-4',
          'transition-all duration-[180ms]',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
```

---

## المرحلة 3: التدقيق والتعديل (الأسبوع الثالث)
### Phase 3: Audit & Refactor (Week 3)

### ✅ الخطوة 3.1: سكريبت التدقيق

**الملف**: `scripts/audit-colors.ts`

```typescript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Patterns to find hardcoded colors
const HARDCODED_REGEX = /(?:bg|text|border|fill|stroke|shadow|caret|outline|ring|from|to|via|placeholder|divide|accent|caret|underline|decoration)-(emerald|blue|red|amber|gray|slate|pink|purple|orange|yellow|green|indigo|cyan|teal|violet|lime|rose|sky|zinc|stone|neutral|white|black)-\d+|\#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/gi;

const SKIP_FILES = [
  'constants',
  'socialColors',
  'index.css',
  'tailwind.config',
  'brand.ts',
  'semantic.ts',
];

function shouldSkip(filePath: string): boolean {
  return SKIP_FILES.some(f => filePath.includes(f));
}

function scanDir(dir: string, results = new Map()) {
  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!['node_modules', '.next', 'dist'].includes(file)) {
        scanDir(fullPath, results);
      }
    } else if (/\.(tsx?|jsx?)$/.test(file) && !shouldSkip(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = [...new Set(content.match(HARDCODED_REGEX) || [])];

      if (matches.length > 0) {
        results.set(fullPath, matches);
      }
    }
  }

  return results;
}

const srcDir = path.join(__dirname, '../src');
const violations = scanDir(srcDir);

console.log('\n🎨 COLOR AUDIT REPORT\n');
console.log(`📊 Files with violations: ${violations.size}`);

let totalViolations = 0;
const violations_array = Array.from(violations.entries())
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 20); // Show top 20

violations_array.forEach(([file, colors]) => {
  const relativePath = path.relative(process.cwd(), file);
  console.log(`\n📄 ${relativePath}`);
  console.log(`   Violations: ${colors.length}`);
  console.log(`   Colors: ${colors.join(', ')}`);
  totalViolations += colors.length;
});

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`⚠️  TOTAL: ${totalViolations} hardcoded color instances`);
console.log(`✅ GOAL: 0 violations by end of refactor`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Exit with error if violations found
process.exit(violations.size > 0 ? 1 : 0);
```

**تشغيل**:
```bash
npm run audit:colors
```

---

### ✅ الخطوة 3.2: نموذج التعديل

**قبل**: `src/components/GlobalLoadingOverlay.tsx`
```typescript
// ❌ WRONG
<motion.div 
  className="w-8 h-8 rounded-full border-t-2 border-r-2 border-emerald-500"
  animate={{ rotate: 360 }}
/>
```

**بعد**: `src/components/GlobalLoadingOverlay.tsx`
```typescript
// ✅ CORRECT
<motion.div 
  className="w-8 h-8 rounded-full border-t-2 border-r-2 border-[var(--fg-accent)]"
  animate={{ rotate: 360 }}
/>
```

---

## المرحلة 4: الإغلاق والتوثيق (الأسبوع الرابع)
### Phase 4: Lock & Document (Week 4)

### ✅ الخطوة 4.1: CI/CD Enforcement

**الملف**: `.github/workflows/brand-check.yml`

```yaml
name: 🎨 Brand Identity Check

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  color-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: 🔍 Run color governance audit
        run: npm run audit:colors

      - name: 💾 Check file structure
        run: |
          test -f src/constants/brand.ts && echo "✅ brand.ts exists"
          test -f src/constants/semantic.ts && echo "✅ semantic.ts exists"
```

**أضف في `package.json`**:
```json
{
  "scripts": {
    "audit:colors": "tsx scripts/audit-colors.ts",
    "lint": "npm run audit:colors && tsc --noEmit"
  }
}
```

---

### ✅ الخطوة 4.2: ملف Contributing

**أضف في `CONTRIBUTING.md`**:

```markdown
## 🎨 Brand & Colors

### Rule #1: No Hardcoded Colors
❌ Forbidden:
- `className="bg-emerald-500"`
- `style={{ color: '#334155' }}`
- `className="text-gray-700"`

✅ Correct:
- `className="bg-[var(--surface-card)]"`
- `className="text-[var(--fg-default)]"`
- `<Button variant="primary" />`
- `<Badge variant="success" />`

### CSS Variables Available
- **Surfaces**: `var(--surface-page)`, `var(--surface-card)`, `var(--surface-subtle)`
- **Text**: `var(--fg-default)`, `var(--fg-muted)`, `var(--fg-accent)`
- **Status**: `var(--fg-success)`, `var(--fg-danger)`, `var(--fg-warning)`

### Color Check
Before commit, run:
```bash
npm run audit:colors
```

If it fails, replace hardcoded colors with CSS variables.
```

---

### ✅ الخطوة 4.3: Storybook Documentation

**الملف**: `src/stories/Colors.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: '🎨 Foundations/Colors',
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const SemanticTokens: StoryObj = {
  render: () => (
    <div className="min-h-screen bg-[var(--surface-page)] p-8">
      <h1 className="text-3xl font-black text-[var(--fg-default)] mb-12">
        Color System
      </h1>

      {/* Surfaces */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[var(--fg-default)] mb-4">
          Surfaces
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            ['--surface-page', 'var(--surface-page)'],
            ['--surface-card', 'var(--surface-card)'],
            ['--surface-subtle', 'var(--surface-subtle)'],
            ['--surface-inset', 'var(--surface-inset)'],
          ].map(([name, value]) => (
            <div
              key={name}
              className="border border-[var(--border-default)] rounded-md p-4"
              style={{ backgroundColor: value }}
            >
              <code className="text-xs text-[var(--fg-muted)]">{name}</code>
            </div>
          ))}
        </div>
      </section>

      {/* Text Colors */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-[var(--fg-default)] mb-4">
          Foreground / Text
        </h2>
        <div className="space-y-2">
          <div className="text-[var(--fg-default)]">
            Default (var(--fg-default))
          </div>
          <div className="text-[var(--fg-muted)]">
            Muted (var(--fg-muted))
          </div>
          <div className="text-[var(--fg-disabled)]">
            Disabled (var(--fg-disabled))
          </div>
          <div className="text-[var(--fg-accent)]">
            Accent (var(--fg-accent))
          </div>
        </div>
      </section>

      {/* Status Colors */}
      <section>
        <h2 className="text-xl font-bold text-[var(--fg-default)] mb-4">
          Status Colors
        </h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            ['Success', 'var(--bg-success-muted)', 'var(--fg-success)'],
            ['Danger', 'var(--bg-danger-muted)', 'var(--fg-danger)'],
            ['Warning', 'var(--bg-attention-muted)', 'var(--fg-attention)'],
            ['Info', 'var(--bg-info-muted)', 'var(--fg-info)'],
          ].map(([name, bg, fg]) => (
            <div
              key={name}
              className="rounded p-4 font-bold text-center"
              style={{
                backgroundColor: bg,
                color: fg,
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};
```

---

## 🎯 Checklist النهائي

### Week 1 ✅
- [ ] إنشاء `src/constants/brand.ts`
- [ ] إنشاء `src/constants/semantic.ts`
- [ ] تصحيح ترتيب الفونتات في `index.css`
- [ ] تحديث `tailwind.config.js`

### Week 2 ✅
- [ ] إنشاء `Button.tsx`
- [ ] إنشاء `Badge.tsx`
- [ ] إنشاء `Card.tsx`
- [ ] إنشاء 5+ مكونات أخرى

### Week 3 ✅
- [ ] تشغيل `npm run audit:colors`
- [ ] تعديل جميع مكونات `src/components/`
- [ ] تعديل جميع صفحات `src/pages/`
- [ ] اختبار Dark/Light mode

### Week 4 ✅
- [ ] إعداد `.github/workflows/brand-check.yml`
- [ ] تحديث `CONTRIBUTING.md`
- [ ] إنشاء Storybook colors
- [ ] اختبار CI/CD

---

## 📊 متتبع التقدم

| المرحلة | المهام | الحالة | النسبة |
|--------|--------|--------|--------|
| الأساسات | 4 مهام | ⏳ | 0% |
| المكونات | 8+ مهام | ⏳ | 0% |
| التدقيق | 4 مهام | ⏳ | 0% |
| الإغلاق | 4 مهام | ⏳ | 0% |

---

## 🔗 الملفات المرتبطة

- `BRAND_IDENTITY.md` - تفاصيل النظام
- `MIGRATION_PLAN.md` - الخطة الكاملة
- GitHub Issues (للتتبع)

---

**Ready? Copy this entire prompt and execute it phase by phase! 🚀**
