import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

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
    console.log(`[Google Analytics Event] ${category} > ${action} (${label || ''})`);
  }
};

export const GoogleAnalytics = () => {
  const { siteSettings } = useAppContext();
  const gaId = siteSettings?.googleAnalyticsId;
  const location = useLocation();

  useEffect(() => {
    if (gaId) {
      // Load gtag script if not already present
      let script1 = document.getElementById('ga-gtag-script') as HTMLScriptElement;
      if (!script1) {
        script1 = document.createElement('script');
        script1.id = 'ga-gtag-script';
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        script1.async = true;
        document.head.appendChild(script1);
      }

      // Initialize gtag config in window
      let script2 = document.getElementById('ga-init-script') as HTMLScriptElement;
      if (!script2) {
        script2 = document.createElement('script');
        script2.id = 'ga-init-script';
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
  }, [gaId]);

  // Track dynamic path navigation for complete SPA metrics
  useEffect(() => {
    if (gaId && (window as any).gtag) {
      (window as any).gtag('config', gaId, {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
      console.log(`[Google Analytics Pageview] Path: ${location.pathname}${location.search}`);
    }
  }, [location, gaId]);

  return null;
};

