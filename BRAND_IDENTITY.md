# 🎨 Perplexta Brand Identity System

## Vision
**Professional, high-contrast, elegant platform** with:
- Emerald accent (primary brand color)
- Slate/Gray base (neutral, accessible)
- Bilingual support (Arabic/English)
- Dark/Light mode with seamless transitions
- Zero-flicker, high-fidelity visual experience

---

## Color Architecture (3-Layer System)

### **LAYER 1: Primitive Tokens (Raw Scale Values)**
```
Raw color definitions - NEVER use directly in components
Used ONLY as sources for Layer 2
```

### **LAYER 2: Semantic Tokens (Intent-Based)**
```
--surface-page      → Page background
--surface-card      → Card/elevated background
--surface-subtle    → Subtle secondary background
--surface-inset     → Input/form fields

--fg-default        → Primary text
--fg-muted          → Secondary/dimmed text
--fg-disabled       → Disabled state text
--fg-on-emphasis    → Text on emphasized backgrounds

--bg-accent-emphasis → Primary interactive elements
--fg-accent         → Accent text/icons

--border-default    → Primary borders
--border-accent     → Accent/focus borders
```

### **LAYER 3: Component Classes (Ready to Use)**
```
.btn-primary    → Primary action buttons
.btn-secondary  → Secondary buttons
.btn-danger     → Destructive actions
.badge-success  → Success status
.badge-warning  → Warning status
```

---

## Brand Color Specification

### **Primary Brand Colors**

| Color | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| **Accent** | `#334155` (Slate-700) | `#94a3b8` (Slate-400) | CTA, focus states, primary actions |
| **Success** | `#1a7f37` (Green-600) | `#3fb950` (Green-500) | Checkmarks, success messages |
| **Danger** | `#cf222e` (Red-600) | `#f85149` (Red-500) | Errors, delete actions |
| **Warning** | `#9a6700` (Amber-700) | `#d29922` (Amber-500) | Cautions, info alerts |
| **Info** | `#0969da` (Blue-600) | `#58a6ff` (Blue-400) | Information, links |

### **Why NOT Emerald as Primary?**
- Current CSS uses **Slate** as primary accent
- Emerald should be **secondary highlight** only
- Slate provides better contrast in light mode
- **Decision needed**: Confirm to switch all Emerald → Slate or vice versa

---

## Typography System

### **Font Hierarchy**

| Element | Font | Weight | Size | Line Height |
|---------|------|--------|------|-------------|
| **Heading 1** | Space Grotesk | 700 | 2rem | 1.35 |
| **Heading 2** | Space Grotesk | 700 | 1.5rem | 1.35 |
| **Body Text** | Tajawal | 400 | 1rem | 1.75 |
| **Small Text** | Tajawal | 400 | 0.875rem | 1.6 |
| **Monospace** | JetBrains Mono | 500 | 0.875rem | 1.5 |

### **Arabic/English Priority**
- **Current**: Space Grotesk > Tajawal ❌
- **Target**: Tajawal > Space Grotesk ✅

```css
/* CORRECT */
--font-sans: "Tajawal", "Space Grotesk", ui-sans-serif;
--font-mono: "JetBrains Mono", monospace;
```

---

## Border Radius System

```css
--radius-xs: 4px   /* Small buttons, compact elements */
--radius-sm: 8px   /* Regular buttons, inputs */
--radius-md: 12px  /* Cards, modals */
--radius-lg: 16px  /* Large panels */
--radius-full: 9999px /* Badges, pills */
```

---

## Spacing Scale

```css
4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px, 64px
```

---

## Animation Tokens

```css
--theme-transition-duration: 180ms
--theme-transition-easing: cubic-bezier(0.22, 1, 0.36, 1)

/* Applied to */
- Theme switches
- Color transitions
- Background animations
- Border changes
```

---

## Accessibility Requirements

### **Color Contrast**
- Text on background: **4.5:1 minimum** (WCAG AA)
- Large text: **3:1 minimum**
- Interactive elements: **3:1 minimum**

### **Dark Mode Adjustments**
- Increase opacity on overlays
- Soften text contrast to reduce eye strain
- Use color-mix() for semantic adjustments

---

## Implementation Checklist

- [ ] Create `src/constants/brand.ts`
- [ ] Create `src/constants/semantic.ts`
- [ ] Audit all component files for hardcoded colors
- [ ] Replace all `bg-emerald-*`, `text-blue-*` with CSS variables
- [ ] Update font family ordering in tailwind.config
- [ ] Enable color governance CI/CD check
- [ ] Create design documentation in Figma/Zeplin
- [ ] Update component storybook with brand tokens

---

## Next Steps
See `MIGRATION_PLAN.md` for implementation roadmap.
