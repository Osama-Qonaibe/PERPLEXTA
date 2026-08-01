import { getBaseUrl } from '../utils/request.js';
import type { Request } from 'express';

export async function pingSearchEngines(req?: Request, customBaseUrl?: string): Promise<{ google: boolean; bing: boolean }> {
  let baseUrl = customBaseUrl;
  if (!baseUrl && req) {
    try {
      baseUrl = getBaseUrl(req);
    } catch {
      baseUrl = process.env.VITE_APP_URL || process.env.APP_URL || 'https://ais-dev-mrbhxkve7xoff5xgw5b35t-315908805121.europe-west1.run.app';
    }
  }
  if (!baseUrl) {
    baseUrl = 'https://ais-dev-mrbhxkve7xoff5xgw5b35t-315908805121.europe-west1.run.app';
  }

  const sitemapUrl = `${baseUrl}/sitemap.xml`;
  let googleSuccess = false;
  let bingSuccess = false;

  // Ping Google Sitemap submission endpoint
  try {
    const googlePingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const googleRes = await fetch(googlePingUrl, { method: 'GET', signal: AbortSignal.timeout(5000) } as any);
    if (googleRes.ok || googleRes.status === 200 || googleRes.status === 204) {
      googleSuccess = true;
      console.log(`[SEO Pinger] Successfully pinged Google sitemap endpoint for ${sitemapUrl}`);
    } else {
      console.warn(`[SEO Pinger] Google sitemap ping returned status ${googleRes.status}`);
    }
  } catch (err: any) {
    console.warn(`[SEO Pinger] Google sitemap ping network error (non-fatal):`, err.message);
  }

  // Ping Bing Sitemap submission endpoint
  try {
    const bingPingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const bingRes = await fetch(bingPingUrl, { method: 'GET', signal: AbortSignal.timeout(5000) } as any);
    if (bingRes.ok || bingRes.status === 200 || bingRes.status === 204) {
      bingSuccess = true;
      console.log(`[SEO Pinger] Successfully pinged Bing sitemap endpoint for ${sitemapUrl}`);
    } else {
      console.warn(`[SEO Pinger] Bing sitemap ping returned status ${bingRes.status}`);
    }
  } catch (err: any) {
    console.warn(`[SEO Pinger] Bing sitemap ping network error (non-fatal):`, err.message);
  }

  return { google: googleSuccess, bing: bingSuccess };
}
