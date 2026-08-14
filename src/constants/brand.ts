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
