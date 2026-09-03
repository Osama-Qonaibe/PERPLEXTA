import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { applyNonce } from '../utils/csp';
import { getCookieConsent, initializeGTM } from '../utils/gtmService';
import { updateGoogleMetaTags } from '../utils/googleMetaHelper';
import { buildOrganizationSchema, buildSoftwareApplicationSchema, injectJsonLdSchema } from '../utils/seoSchemaBuilder';

/**
 * Global helper to track custom events in Google Analytics (GA4).
 * This logs actions, categories, and custom metrics safely, checking cookie consent.
 */
export const trackGAEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && (window as any).gtag && getCookieConsent()) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

export const GoogleAnalytics = () => {
  const { siteSettings, language, plans } = useAppContext();
  const gaId = siteSettings?.googleAnalyticsId;
  const verificationId = siteSettings?.googleSiteVerification;
  const location = useLocation();
  const [consentGranted, setConsentGranted] = useState<boolean>(getCookieConsent());

  // 1. Sync and update dynamic Google-specific meta tags in the head based on site settings
  useEffect(() => {
    updateGoogleMetaTags(verificationId, gaId);
  }, [verificationId, gaId]);

  // 2. Listen to cookie consent change events to trigger dynamic tag initialization instantly
  useEffect(() => {
    const handleConsentChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setConsentGranted(!!customEvent.detail?.granted);
    };

    window.addEventListener('cookie-consent-changed', handleConsentChange);
    return () => {
      window.removeEventListener('cookie-consent-changed', handleConsentChange);
    };
  }, []);

  // 3. Dynamically load GTM & Google Analytics (GA4) only if user consent is provided
  useEffect(() => {
    if (!consentGranted) {
      console.warn('[Analytics Manager] Initialization halted: User consent not granted yet.');
      return;
    }

    // Initialize Google Tag Manager if a GA ID is configured or custom container is used
    if (gaId) {
      // Load standard GTM Container via the safe config service
      initializeGTM(gaId);

      // Load GA4 config and inject standard gtag script safely using the nonce
      let script1 = document.getElementById('ga-gtag-script') as HTMLScriptElement;
      if (!script1) {
        script1 = document.createElement('script');
        script1.id = 'ga-gtag-script';
        applyNonce(script1);
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        script1.async = true;
        document.head.appendChild(script1);
      }

      let script2 = document.getElementById('ga-init-script') as HTMLScriptElement;
      if (!script2) {
        script2 = document.createElement('script');
        script2.id = 'ga-init-script';
        applyNonce(script2);
        script2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${gaId}', { 'send_page_view': false });
        `;
        document.head.appendChild(script2);
      }
    }
  }, [gaId, consentGranted]);

  // 4. Track page views reactively when user navigates
  useEffect(() => {
    if (gaId && consentGranted && (window as any).gtag) {
      (window as any).gtag('config', gaId, {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location, gaId, consentGranted]);

  // 5. Generate and inject rich JSON-LD schemas in document head to improve search indexing visibility
  useEffect(() => {
    if (!siteSettings) return;

    try {
      const currentUrl = window.location.origin;
      const name = language === 'ar' 
        ? (siteSettings.seoSiteNameAr || siteSettings.siteNameAr || siteSettings.siteName || 'بيربليكستا') 
        : (siteSettings.seoSiteNameEn || siteSettings.siteName || 'Perplexta');
      
      const desc = language === 'ar' 
        ? (siteSettings.seoDescriptionAr || siteSettings.siteDescriptionAr || siteSettings.siteDescription || 'منصة التحليل المهني النخبوية') 
        : (siteSettings.seoDescriptionEn || siteSettings.siteDescription || 'Professional Elite Technical Analysis Platform');
      
      const logoUrl = siteSettings.logoBase64 
        ? (siteSettings.logoBase64.startsWith('data:') ? siteSettings.logoBase64 : `${currentUrl}${siteSettings.logoBase64}`) 
        : '';

      // A. Build & Inject standard Organization Schema
      const orgSchema = buildOrganizationSchema({
        name,
        url: currentUrl,
        logo: logoUrl,
        description: desc,
        sameAs: [
          'https://x.com/perplexta',
          'https://github.com/perplexta'
        ],
        email: 'support@perplexta.com'
      });
      injectJsonLdSchema('jsonld-organization', orgSchema);

      // B. Build & Inject SoftwareApplication Schema using plans dynamic ranges if loaded
      let lowPrice: number | undefined;
      let highPrice: number | undefined;
      if (plans && Array.isArray(plans) && plans.length > 0) {
        const premiumPlans = plans.filter(p => !p.isFree && p.monthlyPrice > 0);
        if (premiumPlans.length > 0) {
          const prices = premiumPlans.map(p => Number(p.monthlyPrice)).filter(p => !isNaN(p));
          if (prices.length > 0) {
            lowPrice = Math.min(...prices);
            highPrice = Math.max(...prices);
          }
        }
      }

      const appSchema = buildSoftwareApplicationSchema({
        name,
        description: desc,
        url: currentUrl,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'All',
        lowPrice: lowPrice || 9.99,
        highPrice: highPrice || 99.99,
        priceCurrency: 'USD'
      });
      injectJsonLdSchema('jsonld-software-app', appSchema);
    } catch (e) {
      console.error('[SEO Schema Builder Error]:', e);
    }
  }, [siteSettings, language, plans]);

  return null;
};
