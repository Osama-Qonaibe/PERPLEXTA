export const DESIGN_TOKENS = {
  bgBase: 'var(--bg-base)',
  bgSurface: 'var(--bg-surface)',
  bgInput: 'var(--bg-input)',
  bgOverlay: 'var(--bg-overlay)',
  border: 'var(--border)',
  borderAccent: 'var(--border-accent)',
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',
  accent: 'var(--accent)',
  accentDim: 'var(--accent-dim)',
  accentGlow: 'var(--accent-glow)',
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  radius: 'var(--radius)',
} as const;

export const EMERALD_GLOW = 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]';

export const CSS_CLASSES = {
  card: 'bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius)]',
  input: 'bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] rounded-[var(--radius)]',
  textPrimary: 'text-[var(--text-primary)]',
  textSecondary: 'text-[var(--text-secondary)]',
  textMuted: 'text-[var(--text-muted)]',
  accent: 'text-emerald-500',
  accentBg: 'bg-emerald-500',
  danger: 'text-[var(--danger)]',
  warning: 'text-[var(--warning)]',
  btnToolbar: 'bg-transparent border border-transparent rounded-[4px] w-10 h-10 flex items-center justify-center transition-all duration-300 hover:bg-white/5',
} as const;
