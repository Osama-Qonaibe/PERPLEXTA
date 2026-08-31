/**
 * Dedicated utility to handle Google-specific meta-tags in the head dynamically based on the site settings.
 * Ensures the tags are kept fully synchronised with the application state.
 */
export const updateGoogleMetaTags = (
  googleSiteVerification?: string,
  googleAnalyticsId?: string
): void => {
  if (typeof window === 'undefined') return;

  // 1. Manage 'google-site-verification' tag
  let verificationMeta = document.querySelector('meta[name="google-site-verification"]');
  if (googleSiteVerification) {
    if (!verificationMeta) {
      verificationMeta = document.createElement('meta');
      verificationMeta.setAttribute('name', 'google-site-verification');
      document.head.appendChild(verificationMeta);
    }
    verificationMeta.setAttribute('content', googleSiteVerification);
  } else if (verificationMeta) {
    verificationMeta.remove();
  }

  // 2. Manage 'google-analytics' discovery tag
  let gaMeta = document.querySelector('meta[name="google-analytics"]');
  if (googleAnalyticsId) {
    if (!gaMeta) {
      gaMeta = document.createElement('meta');
      gaMeta.setAttribute('name', 'google-analytics');
      document.head.appendChild(gaMeta);
    }
    gaMeta.setAttribute('content', googleAnalyticsId);
  } else if (gaMeta) {
    gaMeta.remove();
  }

  console.log('[Google Meta Helper] Google-specific meta tags synchronized successfully.');
};
