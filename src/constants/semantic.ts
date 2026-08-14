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

export type SemanticToken = typeof SEMANTIC_COLORS;
