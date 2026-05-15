export type MemoryNotificationType = 'success' | 'warning' | 'cleanup' | 'optimization' | 'startup';

export interface MemoryNotification {
  isVisible: boolean;
  type: MemoryNotificationType;
  desc?: string;
}

export interface MilestoneData {
  count: number;
  total: number;
  description_en: string;
  description_ar: string;
}

export interface SiteSettings {
  siteName: string;
  siteNameAr: string;
  siteDescription: string;
  siteDescriptionAr: string;
  logoBase64: string | null;
  faviconBase64: string | null;
  seoDescriptionEn: string;
  seoDescriptionAr: string;
  keywordsEn: string;
  keywordsAr: string;
  googleAnalyticsId: string;
  maintenanceMode: boolean;
}
