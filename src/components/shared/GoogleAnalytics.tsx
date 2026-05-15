import { useEffect } from 'react';
import { useSettings } from '../../context/SettingsContext';

export const GoogleAnalytics = () => {
  const { siteSettings } = useSettings();
  const gaId = siteSettings?.googleAnalyticsId;

  useEffect(() => {
    if (gaId) {
      // Load gtag script
      const script1 = document.createElement('script');
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      script1.async = true;
      document.head.appendChild(script1);

      // Initialize gtag
      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){window.dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `;
      document.head.appendChild(script2);

      // Cleanup
      return () => {
        document.head.removeChild(script1);
        document.head.removeChild(script2);
      };
    }
  }, [gaId]);

  return null;
};
