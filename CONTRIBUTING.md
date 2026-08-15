# Contributing to Perplexta Platform

Welcome and thank you for contributing to Perplexta! To maintain our high standards of engineering excellence, security, and visual consistency, please follow these guidelines when writing code or submitting pull requests.

---

## 🎨 Brand Identity & Design System

Perplexta uses a strict **3-Layer Color Architecture** inspired by GitHub Primer to ensure robust Dark/Light mode support and zero-redundancy styling:

1. **Layer 1: Primitive Tokens** (`src/constants/brand.ts`)
   - Raw color scales and mode mappings. **Never import primitives directly into components.**
2. **Layer 2: Semantic Tokens** (`src/constants/semantic.ts`)
   - Intent-based aliases (`--surface-*`, `--fg-*`, `--bg-*`, `--border-*`). Always use these in components.
3. **Layer 3: Component Primitives** (`src/components/ui/`)
   - Reusable, accessible UI components (`Button`, `Badge`, `Card`).

### Typography
- **Primary Font**: `Tajawal` (Arabic priority), followed by `Space Grotesk`.
- **Monospace Font**: `JetBrains Mono`.

---

## 🚫 Color Usage Rules (Strict No-Hardcoded-Colors Policy)

To prevent visual inconsistencies and broken dark/light mode themes, **hardcoded color values and Tailwind primitive color classes are strictly prohibited** in components and pages.

### ❌ Forbidden:
- `className="bg-emerald-500"`
- `className="text-gray-700"`
- `style={{ color: '#334155' }}`
- `className="bg-blue-600 hover:bg-blue-700"`

### ✅ Correct (Semantic Variables & Components):
- `className="bg-[var(--surface-card)]"`
- `className="text-[var(--fg-default)]"`
- `className="border-[var(--border-default)]"`
- `<Button variant="primary">...</Button>`
- `<Badge variant="success">...</Badge>`

---

## 🔍 Color Governance & Auditing Script

We provide an automated color governance audit script to detect any hardcoded color violations across the codebase.

### Running the Audit
Before submitting a pull request or committing changes, run:

```bash
npm run audit:colors
```

This script will scan all TypeScript and React files in `src/`, report any detected hardcoded color instances or primitive color classes, and help you maintain 100% compliance with the brand architecture.

---

## 🚀 Pull Request Checklist

1. **No Hardcoded Colors**: Verified via `npm run audit:colors`.
2. **TypeScript & Linter Check**: Ensure `npm run lint` passes without errors.
3. **Build Check**: Ensure `npm run build` succeeds cleanly.
4. **Localization**: Ensure all new user-facing strings support both Arabic (`ar`) and English (`en`).
