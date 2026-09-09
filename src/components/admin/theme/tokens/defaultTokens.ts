import { ThemeTokensMap } from '../types';

export const DEFAULT_LIGHT_TOKENS: ThemeTokensMap = {
  // Surfaces & Canvases
  '--surface-page': '#faf9f5',
  '--surface-canvas': '#faf9f5',
  '--surface-card': '#efe9de',
  '--surface-raised': '#efe9de',
  '--surface-subtle': '#f5f0e8',
  '--surface-inset': '#ebe6df',
  '--surface-overlay': 'rgba(20, 20, 19, 0.4)',

  // Typography & Foreground
  '--fg-primary': '#141413',
  '--fg-secondary': '#3d3d3a',
  '--fg-muted': '#6c6a64',
  '--fg-disabled': '#8e8b82',
  '--fg-on-emphasis': '#ffffff',
  '--font-display': '"Cormorant Garamond", "Tajawal", serif',
  '--font-sans': '"Tajawal", "Inter", ui-sans-serif, system-ui, sans-serif',
  '--font-mono': '"JetBrains Mono", ui-monospace, monospace',

  // Brand & Accent
  '--accent': '#cc785c',
  '--accent-hover': '#a9583e',
  '--fg-accent': '#cc785c',
  '--bg-accent-emphasis': '#cc785c',
  '--bg-accent-muted': 'rgba(204, 120, 92, 0.12)',
  '--border-accent-emphasis': '#cc785c',
  '--focus-outline': '#cc785c',

  // Borders & Dividers
  '--border-default': '#e6dfd8',
  '--border-outer-input': '#d1c7bd',
  '--border-inner-input': '#e0d6cc',
  '--border-subtle': '#ebe6df',
  '--border-strong': '#c2bcb5',
  '--border-accent': '#cc785c',

  // Buttons & Controls
  '--bg-btn-primary': '#cc785c',
  '--fg-btn-primary': '#ffffff',
  '--bg-btn-secondary': '#efe9de',
  '--border-btn-secondary': '#d1c7bd',

  // Inputs & Forms
  '--bg-input': '#f5f0e8',
  '--border-focus': '#cc785c',

  // Admin & Layout
  '--admin-nav-bg': '#f5f0e8',
  '--admin-nav-item-active': '#efe9de',
  '--admin-header-bg': '#faf9f5',
  '--admin-card-border': '#e6dfd8',
  '--admin-table-header-bg': '#ebe6df',
  '--admin-table-row-hover': '#f5f0e8',

  // Chat & Messaging
  '--chat-bubble-user': '#cc785c',
  '--chat-bubble-assistant': '#efe9de',
  '--chat-bubble-user-text': '#ffffff',
  '--chat-bubble-assistant-text': '#141413',

  // Status & Alerts
  '--fg-success': '#5db872',
  '--fg-warning': '#e8a55a',
  '--fg-danger': '#c64545',
  '--fg-info': '#5db8a6',
  '--status-success-subtle': 'rgba(93, 184, 114, 0.12)',
  '--status-warning-subtle': 'rgba(232, 165, 90, 0.12)',
  '--status-danger-subtle': 'rgba(198, 69, 69, 0.10)',
  '--status-info-subtle': 'rgba(93, 184, 166, 0.12)',

  // Geometry & Elevation
  '--radius-xs': '4px',
  '--radius-sm': '8px',
  '--radius-md': '12px',
  '--radius-lg': '16px',
  '--radius-xl': '16px',
  '--radius-full': '9999px',
  '--shadow-sm': '0 1px 2px rgba(20, 20, 19, 0.05)',
  '--shadow-md': '0 4px 12px rgba(20, 20, 19, 0.08)',
  '--shadow-lg': '0 10px 25px rgba(20, 20, 19, 0.12)'
};

export const DEFAULT_DARK_TOKENS: ThemeTokensMap = {
  // Surfaces & Canvases
  '--surface-page': '#181715',
  '--surface-canvas': '#181715',
  '--surface-card': '#1f1e1b',
  '--surface-raised': '#1f1e1b',
  '--surface-subtle': '#252320',
  '--surface-inset': '#2a2825',
  '--surface-overlay': 'rgba(24, 23, 21, 0.88)',

  // Typography & Foreground
  '--fg-primary': '#faf9f5',
  '--fg-secondary': '#a09d96',
  '--fg-muted': '#6c6a64',
  '--fg-disabled': '#55534e',
  '--fg-on-emphasis': '#ffffff',
  '--font-display': '"Cormorant Garamond", "Tajawal", serif',
  '--font-sans': '"Tajawal", "Inter", ui-sans-serif, system-ui, sans-serif',
  '--font-mono': '"JetBrains Mono", ui-monospace, monospace',

  // Brand & Accent
  '--accent': '#cc785c',
  '--accent-hover': '#a9583e',
  '--fg-accent': '#d4957f',
  '--bg-accent-emphasis': '#cc785c',
  '--bg-accent-muted': 'rgba(204, 120, 92, 0.18)',
  '--border-accent-emphasis': '#cc785c',
  '--focus-outline': '#d4957f',

  // Borders & Dividers
  '--border-default': 'rgba(250, 249, 245, 0.10)',
  '--border-outer-input': 'rgba(250, 249, 245, 0.15)',
  '--border-inner-input': 'rgba(250, 249, 245, 0.08)',
  '--border-subtle': 'rgba(250, 249, 245, 0.05)',
  '--border-strong': 'rgba(250, 249, 245, 0.20)',
  '--border-accent': '#d4957f',

  // Buttons & Controls
  '--bg-btn-primary': '#cc785c',
  '--fg-btn-primary': '#ffffff',
  '--bg-btn-secondary': '#252320',
  '--border-btn-secondary': 'rgba(250, 249, 245, 0.15)',

  // Inputs & Forms
  '--bg-input': '#252320',
  '--border-focus': 'rgba(250, 249, 245, 0.25)',

  // Admin & Layout
  '--admin-nav-bg': '#1f1e1b',
  '--admin-nav-item-active': '#252320',
  '--admin-header-bg': '#181715',
  '--admin-card-border': 'rgba(250, 249, 245, 0.10)',
  '--admin-table-header-bg': '#252320',
  '--admin-table-row-hover': '#2a2825',

  // Chat & Messaging
  '--chat-bubble-user': '#cc785c',
  '--chat-bubble-assistant': '#1f1e1b',
  '--chat-bubble-user-text': '#ffffff',
  '--chat-bubble-assistant-text': '#faf9f5',

  // Status & Alerts
  '--fg-success': '#5db872',
  '--fg-warning': '#e8a55a',
  '--fg-danger': '#e5735f',
  '--fg-info': '#5db8a6',
  '--status-success-subtle': 'rgba(93, 184, 114, 0.15)',
  '--status-warning-subtle': 'rgba(232, 165, 90, 0.12)',
  '--status-danger-subtle': 'rgba(198, 69, 69, 0.15)',
  '--status-info-subtle': 'rgba(93, 184, 166, 0.15)',

  // Geometry & Elevation
  '--radius-xs': '4px',
  '--radius-sm': '8px',
  '--radius-md': '12px',
  '--radius-lg': '16px',
  '--radius-xl': '16px',
  '--radius-full': '9999px',
  '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
  '--shadow-md': '0 4px 12px rgba(0, 0, 0, 0.4)',
  '--shadow-lg': '0 10px 25px rgba(0, 0, 0, 0.5)'
};
