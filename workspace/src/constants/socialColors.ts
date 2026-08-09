export const SOCIAL_COLORS = {
  whatsapp: {
    base: '#25D366',
    dark: '#128C7E',
  },
  telegram: {
    base: '#229ED9',
    dark: '#168AC0',
  },
  linkedin: {
    base: '#0A66C2',
    dark: '#084A8C',
  },
  facebook: {
    base: '#1877F2',
    dark: '#145DBF',
  },
  twitter: {
    base: '#111827',
    dark: '#E5E7EB',
  },
  google: {
    base: '#EA4335',
    dark: '#C5221F',
  },
  github: {
    base: '#24292F',
    dark: '#0D1117',
  },
} as const;

export type SocialProvider = keyof typeof SOCIAL_COLORS;
