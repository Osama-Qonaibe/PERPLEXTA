import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        'surface-page': 'var(--surface-page)',
        'surface-card': 'var(--surface-card)',
        'surface-subtle': 'var(--surface-subtle)',
        'surface-inset': 'var(--surface-inset)',

        // Text / Foreground
        'fg-default': 'var(--fg-default)',
        'fg-muted': 'var(--fg-muted)',
        'fg-disabled': 'var(--fg-disabled)',
        'fg-accent': 'var(--fg-accent)',
        'fg-on-emphasis': 'var(--fg-on-emphasis)',

        // Background
        'bg-primary': 'var(--bg-default)',
        'bg-secondary': 'var(--bg-muted)',
        'bg-accent': 'var(--bg-accent-emphasis)',
        'bg-accent-muted': 'var(--bg-accent-muted)',
        'bg-inset': 'var(--bg-inset)',

        // Borders
        'border-default': 'var(--border-default)',
        'border-muted': 'var(--border-muted)',
        'border-accent': 'var(--border-accent-emphasis)',

        // Status Colors
        'success-fg': 'var(--fg-success)',
        'success-bg': 'var(--bg-success-muted)',
        'danger-fg': 'var(--fg-danger)',
        'danger-bg': 'var(--bg-danger-muted)',
        'warning-fg': 'var(--fg-attention)',
        'warning-bg': 'var(--bg-attention-muted)',
        'info-fg': 'var(--fg-info)',
        'info-bg': 'var(--bg-info-muted)',
      },

      fontFamily: {
        sans: [
          'Tajawal',
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

      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full, 9999px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
