export interface FontLanguageConfig {
  fontFamily: string;
  enabled: boolean;
  url: string;
  weights?: number[];
  fallback?: string[];
}

export interface FontLoadingConfig {
  ar: FontLanguageConfig;
  en: FontLanguageConfig;
  dynamicLoading: boolean;
  [key: string]: any;
}

export const DEFAULT_FONT_CONFIG: FontLoadingConfig = {
  ar: {
    fontFamily: 'Tajawal',
    enabled: true,
    url: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap'
  },
  en: {
    fontFamily: 'Space Grotesk',
    enabled: true,
    url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap'
  },
  dynamicLoading: true
};

/**
 * Dynamically updates font stylesheets in <head> based on the active language and font loading config.
 * Ensures that 'Tajawal' and 'Space Grotesk' are loaded only when necessary for the selected language.
 */
export function applyLanguageFont(lang: 'ar' | 'en', config?: FontLoadingConfig | null) {
  if (typeof document === 'undefined') return;

  const currentConfig: FontLoadingConfig = {
    ...DEFAULT_FONT_CONFIG,
    ...config,
    ar: { ...DEFAULT_FONT_CONFIG.ar, ...(config?.ar || {}) },
    en: { ...DEFAULT_FONT_CONFIG.en, ...(config?.en || {}) }
  };

  const dynamicLoading = currentConfig.dynamicLoading !== false;

  const tajawalLinkId = 'font-stylesheet-tajawal';
  const spaceGroteskLinkId = 'font-stylesheet-space-grotesk';

  let tajawalLink = document.getElementById(tajawalLinkId) as HTMLLinkElement | null;
  let spaceGroteskLink = document.getElementById(spaceGroteskLinkId) as HTMLLinkElement | null;
  const legacyLink = document.getElementById('dynamic-language-font') as HTMLLinkElement | null;

  if (legacyLink && legacyLink.parentNode) {
    legacyLink.parentNode.removeChild(legacyLink);
  }

  if (lang === 'ar') {
    // When active language is Arabic ('ar'):
    // 1. Ensure Tajawal font link is attached if enabled
    if (currentConfig.ar.enabled) {
      if (!tajawalLink) {
        tajawalLink = document.createElement('link');
        tajawalLink.id = tajawalLinkId;
        tajawalLink.rel = 'stylesheet';
        tajawalLink.href = currentConfig.ar.url;
        document.head.appendChild(tajawalLink);
      } else if (tajawalLink.href !== currentConfig.ar.url) {
        tajawalLink.href = currentConfig.ar.url;
      }
    }

    // 2. If dynamic font loading is active, omit/remove Space Grotesk (English font) to save memory/bandwidth
    if (dynamicLoading && spaceGroteskLink && spaceGroteskLink.parentNode) {
      spaceGroteskLink.parentNode.removeChild(spaceGroteskLink);
    }

    // 3. Set primary font family variable
    const fontStack = `"${currentConfig.ar.fontFamily}", ui-sans-serif, system-ui, sans-serif`;
    document.documentElement.style.setProperty('--font-sans', fontStack);
  } else {
    // When active language is English ('en'):
    // 1. Ensure Space Grotesk font link is attached if enabled
    if (currentConfig.en.enabled) {
      if (!spaceGroteskLink) {
        spaceGroteskLink = document.createElement('link');
        spaceGroteskLink.id = spaceGroteskLinkId;
        spaceGroteskLink.rel = 'stylesheet';
        spaceGroteskLink.href = currentConfig.en.url;
        document.head.appendChild(spaceGroteskLink);
      } else if (spaceGroteskLink.href !== currentConfig.en.url) {
        spaceGroteskLink.href = currentConfig.en.url;
      }
    }

    // 2. If dynamic font loading is active, omit/remove Tajawal (Arabic font) to save memory/bandwidth
    if (dynamicLoading && tajawalLink && tajawalLink.parentNode) {
      tajawalLink.parentNode.removeChild(tajawalLink);
    }

    // 3. Set primary font family variable
    const fontStack = `"${currentConfig.en.fontFamily}", ui-sans-serif, system-ui, sans-serif`;
    document.documentElement.style.setProperty('--font-sans', fontStack);
  }
}
