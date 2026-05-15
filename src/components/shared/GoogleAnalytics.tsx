import { useEffect } from 'react';

interface GoogleAnalyticsProps {
  id: string;
}

export function GoogleAnalytics({ id }: GoogleAnalyticsProps) {
  useEffect(() => {
    if (!id) return;
    const script1 = document.createElement('script');
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script1.async = true;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
    document.head.appendChild(script2);

    return () => {
      document.head.removeChild(script1);
      document.head.removeChild(script2);
    };
  }, [id]);

  return null;
}
