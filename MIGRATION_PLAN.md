# 🚀 Perplexta Brand Migration Plan
## From Scattered Colors → GitHub-Style Design System

---

## Overview

Transform Perplexta from **scattered hardcoded colors** to a **centralized, maintainable design system** like GitHub Primer in 4 phases.

**Current State**: 70% hardcoded colors, 30% semantic tokens  
**Target State**: 5% hardcoded colors, 95% semantic tokens

---

## Phase 1: Foundation (Week 1)

### Goal
Establish the core design token infrastructure.

### Tasks

#### 1.1 Create Brand Constants File
**File**: `src/constants/brand.ts`

```typescript
/**
 * PERPLEXTA BRAND IDENTITY
 * Central source of truth for all design tokens
 * 
 * RULE: Never import colors from this file directly in components.
 * Use semantic tokens in src/constants/semantic.ts instead.
 */

export const PRIMITIVE_TOKENS = {
  // Neutral Scale (Gray)
  gray: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  // Slate (Primary Accent)
  slate: {
    DEFAULT: '#334155',
    hover: '#1e293b',
    active: '#0f172a',
    light: '#94a3b8',
  },

  // Emerald (Secondary Accent - Logo/Badges)
  emerald: {
    DEFAULT: '#1a7f37',
    light: '#2ea043',
    dark: '#116329',
  },

  // Semantic Colors
  green: {
    emphasis: '#1a7f37',
    muted: '#dafbe1',
  },
  red: {
    emphasis: '#cf222e',
    muted: '#ffebe9',
  },
  amber: {
    emphasis: '#9a6700',
    muted: '#fff8c5',
  },
  blue: {
    emphasis: '#0969da',
    muted: '#ddf4ff',
  },
} as const;

export const DARK_MODE_OVERRIDES = {
  green: '#3fb950',
  red: '#f85149',
  amber: '#d29922',
  blue: '#58a6ff',
} as const;

export type PrimitiveTokens = typeof PRIMITIVE_TOKENS;
```

#### 1.2 Create Semantic Tokens File
**File**: `src/constants/semantic.ts`

```typescript
/**
 * SEMANTIC TOKENS
 * 
 * Intent-based color aliases that adapt to light/dark modes.
 * Components ALWAYS use these, never primitives.
 * 
 * Examples:
 * - bg-surface-card → Card background (white in light, dark in dark mode)
 * - fg-accent → Accent text (slate-700 in light, slate-400 in dark)
 */

export const SEMANTIC_COLORS = {
  // Surface System
  surface: {
    page: 'var(--surface-page)',
    card: 'var(--surface-card)',
    subtle: 'var(--surface-subtle)',
    inset: 'var(--surface-inset)',
    overlay: 'var(--surface-overlay)',
  },

  // Foreground (Text & Icons)
  fg: {
    default: 'var(--fg-default)',
    muted: 'var(--fg-muted)',
    disabled: 'var(--fg-disabled)',
    onEmphasis: 'var(--fg-on-emphasis)',
    accent: 'var(--fg-accent)',
  },

  // Background
  bg: {
    default: 'var(--bg-default)',
    muted: 'var(--bg-muted)',
    inset: 'var(--bg-inset)',
    accentEmphasis: 'var(--bg-accent-emphasis)',
    accentMuted: 'var(--bg-accent-muted)',
  },

  // Borders
  border: {
    default: 'var(--border-default)',
    muted: 'var(--border-muted)',
    accentEmphasis: 'var(--border-accent-emphasis)',
  },

  // Status Colors
  status: {
    success: 'var(--fg-success)',
    danger: 'var(--fg-danger)',
    warning: 'var(--fg-attention)',
    info: 'var(--fg-info)',
  },

  // Background Status
  statusBg: {
    successMuted: 'var(--bg-success-muted)',
    successEmphasis: 'var(--bg-success-emphasis)',
    dangerMuted: 'var(--bg-danger-muted)',
    dangerEmphasis: 'var(--bg-danger-emphasis)',
    warningMuted: 'var(--bg-attention-muted)',
    warningEmphasis: 'var(--bg-attention-emphasis)',
    infoMuted: 'var(--bg-info-muted)',
  },
} as const;

export type SemanticToken = typeof SEMANTIC_COLORS;
```

#### 1.3 Update tailwind.config.js
**File**: `tailwind.config.js`

```typescript
export default {
  theme: {
    extend: {
      colors: {
        // Map Tailwind colors to CSS variables
        surface: {
          page: 'var(--surface-page)',
          card: 'var(--surface-card)',
          subtle: 'var(--surface-subtle)',
          inset: 'var(--surface-inset)',
        },
        fg: {
          default: 'var(--fg-default)',
          muted: 'var(--fg-muted)',
          disabled: 'var(--fg-disabled)',
          onEmphasis: 'var(--fg-on-emphasis)',
          accent: 'var(--fg-accent)',
        },
        border: {
          default: 'var(--border-default)',
          muted: 'var(--border-muted)',
          accent: 'var(--border-accent-emphasis)',
        },
      },
      fontFamily: {
        sans: [
          'Tajawal',      // ✅ Arabic priority
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
    },
  },
  // ... rest of config
}
```

---

## Phase 2: Component Library (Week 2)

### Goal
Create reusable, branded components.

### Tasks

#### 2.1 Create Base Button Component
**File**: `src/components/ui/Button.tsx`

```typescript
import React from 'react';
import clsx from 'clsx';
import { SEMANTIC_COLORS } from '../../constants/semantic';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] hover:bg-opacity-90 active:bg-opacity-80',
      secondary: 'bg-[var(--bg-muted)] text-[var(--fg-default)] hover:bg-[var(--bg-overlay)] border border-[var(--border-default)]',
      danger: 'bg-[var(--bg-danger-muted)] text-[var(--fg-danger)] hover:bg-[var(--bg-danger-emphasis)] hover:text-[var(--fg-on-emphasis)]',
      ghost: 'bg-transparent text-[var(--fg-default)] hover:bg-[var(--bg-hover)] border border-transparent',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs font-semibold',
      md: 'px-4 py-2 text-sm font-semibold',
      lg: 'px-6 py-3 text-base font-bold',
    };

    return (
      <button
        ref={ref}
        className={clsx(
          'rounded-[var(--radius-sm)] transition-all duration-180',
          'focus:outline-none focus:ring-2 focus:ring-[var(--focus-outline)] focus:ring-offset-2',
          'active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

#### 2.2 Create Badge Component
**File**: `src/components/ui/Badge.tsx`

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
    default: 'bg-[var(--bg-accent-muted)] text-[var(--fg-accent)]',
    success: 'bg-[var(--bg-success-muted)] text-[var(--fg-success)]',
    danger: 'bg-[var(--bg-danger-muted)] text-[var(--fg-danger)]',
    warning: 'bg-[var(--bg-attention-muted)] text-[var(--fg-attention)]',
    info: 'bg-[var(--bg-info-muted)] text-[var(--fg-info)]',
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs font-bold',
    md: 'px-3 py-1.5 text-sm font-bold',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-[var(--radius-full)] border',
        'border-current/20',
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

#### 2.3 Create Card Component
**File**: `src/components/ui/Card.tsx`

```typescript
import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'elevated' | 'flat' | 'outlined';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', className, children, ...props }, ref) => {
    const variantStyles = {
      elevated: 'bg-[var(--surface-card)] border border-[var(--border-default)] shadow-sm',
      flat: 'bg-[var(--surface-subtle)]',
      outlined: 'bg-transparent border-2 border-[var(--border-default)]',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-[var(--radius-md)] p-4',
          'transition-all duration-180',
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

## Phase 3: Audit & Refactor (Week 3)

### Goal
Replace all hardcoded colors with semantic tokens.

### Tasks

#### 3.1 Automated Color Audit Script
**File**: `scripts/audit-colors.ts`

```typescript
import fs from 'fs';
import path from 'path';

const HARDCODED_COLORS_REGEX = /(?:bg|text|border|fill|stroke)-(?:emerald|blue|red|amber|gray|slate|pink|purple|orange|yellow|green|indigo|cyan|teal|violet|lime|rose|sky|zinc|slate|stone|neutral|color-mix|rgba?)\-?\d*|\#[0-9a-f]{6}|\#[0-9a-f]{3}/gi;

const ALLOWED_FILES = ['constants', 'socialColors', 'index.css'];

function shouldSkipFile(filePath: string): boolean {
  return ALLOWED_FILES.some(allowed => filePath.includes(allowed));
}

function auditDirectory(dir: string, results: Map<string, any[]> = new Map()) {
  if (!fs.existsSync(dir)) return results;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      auditDirectory(fullPath, results);
    } else if (/\.(tsx?|jsx?)$/.test(file) && !shouldSkipFile(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(HARDCODED_COLORS_REGEX) || [];

      if (matches.length > 0) {
        results.set(fullPath, [...new Set(matches)]);
      }
    }
  }
  return results;
}

const srcDir = path.join(process.cwd(), 'src');
const violations = auditDirectory(srcDir);

console.log('\n🎨 COLOR AUDIT REPORT\n');
console.log(`Total files with violations: ${violations.size}\n`);

let totalViolations = 0;
violations.forEach((colors, file) => {
  console.log(`📄 ${file}`);
  console.log(`   Colors found: ${colors.join(', ')}`);
  console.log(`   Count: ${colors.length}\n`);
  totalViolations += colors.length;
});

console.log(`\n⚠️  Total hardcoded color instances: ${totalViolations}`);
console.log('📝 Refactor to use CSS variables: var(--fg-default), var(--surface-card), etc.\n');

process.exit(0);
```

#### 3.2 Refactor Examples

**Before:**
```typescript
// ❌ BAD: Hardcoded colors
<div className="bg-emerald-500 text-gray-700 border-blue-200">
  <button className="bg-slate-700 text-white hover:bg-slate-800">
    Click me
  </button>
</div>
```

**After:**
```typescript
// ✅ GOOD: Semantic tokens
<div className="bg-[var(--surface-card)] text-[var(--fg-default)] border-[var(--border-default)]">
  <Button variant="primary">
    Click me
  </Button>
</div>
```

---

## Phase 4: Documentation & Enforcement (Week 4)

### Goal
Lock in the system and prevent regression.

### Tasks

#### 4.1 Update Contributing Guide
**File**: `CONTRIBUTING.md` (add section)

```markdown
## Brand & Design Tokens

### Color Usage Rules

1. **NEVER hardcode colors** in components
2. **ALWAYS use CSS variables** for colors
3. **Use component variants** (Button, Badge, etc.)

### Correct Usage

```typescript
// ✅ CSS Variables
<div className="text-[var(--fg-default)]">
<div className="bg-[var(--surface-card)]">

// ✅ Component APIs
<Button variant="primary" />
<Badge variant="success" />

// ❌ Hardcoded
<div className="text-gray-700">
<div className="bg-emerald-500">
```

### Pre-commit Hook

We run `npm run check:colors` before every commit.
If it fails, refactor colors to use semantic tokens.
```

#### 4.2 Enable CI/CD Enforcement
**File**: `.github/workflows/brand-check.yml`

```yaml
name: Brand Identity Check

on: [pull_request, push]

jobs:
  brand-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Run color governance check
        run: npm run check:colors

      - name: Fail if violations found
        if: failure()
        run: |
          echo "❌ Brand identity violations detected!"
          echo "Run 'npm run check:colors' locally to see violations"
          exit 1
```

#### 4.3 Create Component Storybook
**File**: `src/stories/Colors.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { SEMANTIC_COLORS } from '../constants/semantic';

const meta: Meta = {
  title: 'Foundations/Colors',
  parameters: {
    docs: {
      description: {
        component: 'Color token system reference',
      },
    },
  },
};

export default meta;

export const SemanticTokens: StoryObj = {
  render: () => (
    <div className="space-y-8 p-8">
      <div>
        <h2 className="text-xl font-bold mb-4">Surfaces</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[var(--surface-page)] border border-[var(--border-default)] p-4 rounded">
            <p className="text-xs font-mono text-[var(--text-muted)]">--surface-page</p>
          </div>
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] p-4 rounded">
            <p className="text-xs font-mono text-[var(--text-muted)]">--surface-card</p>
          </div>
          {/* More surfaces... */}
        </div>
      </div>
    </div>
  ),
};
```

---

## Migration Roadmap Timeline

```
WEEK 1 (Foundation)
├─ Create brand.ts & semantic.ts
├─ Update index.css with correct layer structure
├─ Fix font family ordering
└─ Update tailwind.config

WEEK 2 (Components)
├─ Button, Badge, Card components
├─ Input, TextArea components
├─ Modal, Dialog components
└─ Alert, Toast components

WEEK 3 (Refactor)
├─ Audit all 200+ component files
├─ Batch replace hardcoded colors
├─ Update pages/ and components/ directories
└─ Test dark/light mode switching

WEEK 4 (Lock-In)
├─ Create Storybook documentation
├─ Enable CI/CD enforcement
├─ Update CONTRIBUTING.md
└─ Team training & handoff
```

---

## Success Metrics

- [ ] 95%+ components use semantic tokens
- [ ] 0 hardcoded colors in component code
- [ ] CI/CD passes on all PRs
- [ ] Dark/light mode works perfectly
- [ ] All 19 languages render properly
- [ ] Figma design kit matches implementation
- [ ] Team can implement new components in 5 minutes

---

## Resources

- 📚 [GitHub Primer Design System](https://primer.style/)
- 📚 [Token JSON Format Spec](https://design-tokens.github.io/community-group/format/)
- 📚 [Tailwind CSS Custom Properties](https://tailwindcss.com/docs/using-css-variables)
- 📚 [Color Accessibility Guide](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum)

