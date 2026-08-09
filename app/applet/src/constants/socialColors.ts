export const SOCIAL_COLORS = {
  whatsapp: {
    base: '#25D366',
    dark: '#128C7E',
    soft: 'rgba(37, 211, 102, 0.10)',
    border: 'rgba(37, 211, 102, 0.30)',
  },

  telegram: {
    base: '#229ED9',
    dark: '#168AC0',
    soft: 'rgba(34, 158, 217, 0.10)',
    border: 'rgba(34, 158, 217, 0.30)',
  },

  linkedin: {
    base: '#0A66C2',
    dark: '#084A8C',
    soft: 'rgba(10, 102, 194, 0.10)',
    border: 'rgba(10, 102, 194, 0.30)',
  },

  facebook: {
    base: '#1877F2',
    dark: '#145DBF',
    soft: 'rgba(24, 119, 242, 0.10)',
    border: 'rgba(24, 119, 242, 0.30)',
  },

  twitter: {
    base: '#111827',
    dark: '#E5E7EB',
    soft: 'rgba(17, 24, 39, 0.08)',
    border: 'rgba(17, 24, 39, 0.25)',
  },
} as const;

export type SocialProvider = keyof typeof SOCIAL_COLORS;
