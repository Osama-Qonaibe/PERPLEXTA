import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tajawal', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Cormorant Garamond', 'Tajawal', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        'surface-page': 'var(--surface-page)',
        'surface-canvas': 'var(--surface-canvas)',
        'surface-card': 'var(--surface-card)',
        'surface-raised': 'var(--surface-raised)',
        'surface-input': 'var(--surface-input)',
        'surface-overlay': 'var(--surface-overlay)',

        'fg-primary': 'var(--fg-primary)',
        'fg-secondary': 'var(--fg-secondary)',
        'fg-muted': 'var(--fg-muted)',
        'fg-on-accent': 'var(--fg-on-accent)',
        'fg-success': 'var(--fg-success)',
        'fg-warning': 'var(--fg-warning)',
        'fg-danger': 'var(--fg-danger)',
        'fg-info': 'var(--fg-info)',

        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
        'border-focus': 'var(--border-focus)',

        'accent': 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-subtle': 'var(--accent-subtle)',
        'accent-foreground': 'var(--accent-foreground)',

        'status-success': 'var(--status-success)',
        'status-success-subtle': 'var(--status-success-subtle)',
        'status-warning': 'var(--status-warning)',
        'status-warning-subtle': 'var(--status-warning-subtle)',
        'status-danger': 'var(--status-danger)',
        'status-danger-subtle': 'var(--status-danger-subtle)',
        'status-info': 'var(--status-info)',
        'status-info-subtle': 'var(--status-info-subtle)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
        slow: 'var(--motion-slow)',
      },
      transitionTimingFunction: {
        ease: 'var(--motion-ease)',
      },
    },
  },
  plugins: [],
} satisfies Config;
