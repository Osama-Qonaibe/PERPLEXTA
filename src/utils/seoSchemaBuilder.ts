import { applyNonce } from './csp';

export interface OrganizationSchema {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs?: string[];
  contactPoint?: {
    '@type': 'ContactPoint';
    telephone?: string;
    contactType: string;
    email?: string;
    areaServed?: string;
    availableLanguage?: string[];
  }[];
}

export interface SoftwareApplicationSchema {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string;
  softwareVersion?: string;
  fileSize?: string;
  offers?: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
    category?: string;
  } | {
    '@type': 'AggregateOffer';
    lowPrice: string;
    highPrice: string;
    priceCurrency: string;
    offerCount?: number;
  };
  aggregateRating?: {
    '@type': 'AggregateRating';
    ratingValue: string;
    ratingCount: string;
    bestRating?: string;
    worstRating?: string;
  };
}

/**
 * Builds standard Google 'Organization' JSON-LD structured data.
 */
export const buildOrganizationSchema = (options: {
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs?: string[];
  email?: string;
}): OrganizationSchema => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: options.name,
    url: options.url,
    logo: options.logo,
    description: options.description,
    sameAs: options.sameAs || [],
    contactPoint: options.email ? [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: options.email,
        availableLanguage: ['Arabic', 'English']
      }
    ] : undefined
  };
};

/**
 * Builds standard Google 'SoftwareApplication' JSON-LD structured data.
 */
export const buildSoftwareApplicationSchema = (options: {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string; // e.g. BusinessApplication, UtilitiesApplication, DeveloperApplication
  operatingSystem?: string; // e.g. All, Web, Windows, Android, iOS
  lowPrice?: string | number;
  highPrice?: string | number;
  priceCurrency?: string;
  softwareVersion?: string;
}): SoftwareApplicationSchema => {
  const category = options.applicationCategory || 'BusinessApplication';
  const os = options.operatingSystem || 'All';

  const schema: SoftwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: options.name,
    description: options.description,
    url: options.url,
    applicationCategory: category,
    operatingSystem: os,
    softwareVersion: options.softwareVersion || '1.0.0'
  };

  if (options.lowPrice !== undefined && options.highPrice !== undefined) {
    schema.offers = {
      '@type': 'AggregateOffer',
      lowPrice: options.lowPrice.toString(),
      highPrice: options.highPrice.toString(),
      priceCurrency: options.priceCurrency || 'USD'
    };
  } else if (options.lowPrice !== undefined) {
    schema.offers = {
      '@type': 'Offer',
      price: options.lowPrice.toString(),
      priceCurrency: options.priceCurrency || 'USD'
    };
  }

  return schema;
};

/**
 * Dynamically injects or updates a JSON-LD structured data block in the <head> of the document.
 * Using a specific ID guarantees that we do not leave duplicates or stale metadata behind.
 */
export const injectJsonLdSchema = (id: string, schema: object): void => {
  if (typeof window === 'undefined') return;

  let script = document.getElementById(id) as HTMLScriptElement;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    applyNonce(script);
    document.head.appendChild(script);
  }

  script.innerHTML = JSON.stringify(schema, null, 2);
  console.log(`[SEO Schema Builder] Successfully injected JSON-LD schema with ID: ${id}`);
};

/**
 * Clean up existing injected JSON-LD script blocks from the <head>.
 */
export const removeJsonLdSchema = (id: string): void => {
  if (typeof window === 'undefined') return;
  const script = document.getElementById(id);
  if (script) {
    script.remove();
    console.log(`[SEO Schema Builder] Cleaned up JSON-LD schema with ID: ${id}`);
  }
};
