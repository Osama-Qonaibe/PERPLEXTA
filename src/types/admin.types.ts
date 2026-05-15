export interface AdminStats {
  monthlyRevenue: number;
  activeUsersToday: number;
  newSubscriptionsToday: number;
  openKycCases: number;
  pendingWithdrawals: number;
  systemAlerts: number;
}

export interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: any;
  description?: string;
  is_secret: boolean;
  updated_at: string;
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
}
