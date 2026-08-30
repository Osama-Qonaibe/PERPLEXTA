import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { applyNonce } from '../utils/csp';


/**
 * Global helper to track custom events in Google Analytics.
 * This logs actions, categories, and custom metrics accurately.
 */
export const trackGAEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

export const GoogleAnalytics = () => {
  const { siteSettings } = useAppContext();
  const gaId = siteSettings?.googleAnalyticsId;
  const location = useLocation();

  useEffect(() => {
    if (gaId) {
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

          // Google Consent Mode v2 (Default Configuration)
          gtag('consent', 'default', {
            'ad_storage': 'denied',
            'analytics_storage': 'granted',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'wait_for_update': 500
          });

          gtag('js', new Date());
          gtag('config', '${gaId}', { 'send_page_view': false });
        `;
        document.head.appendChild(script2);
      }
    }
  }, [gaId]);

  useEffect(() => {
    if (gaId && (window as any).gtag) {
      (window as any).gtag('config', gaId, {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location, gaId]);

  return null;
};

