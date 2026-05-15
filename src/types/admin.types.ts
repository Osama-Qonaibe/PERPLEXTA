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

export interface AdminStats {
  total_users: number;
  active_users_today: number;
  monthly_revenue: number;
  ai_generations: number;
  system_health: number;
}

export interface SecurityAlert {
  id: number;
  type: 'withdrawal' | 'kyc' | 'high_value' | 'suspicious';
  level: 'secure' | 'warning' | 'critical';
  message: string;
  user_id?: number;
  created_at: string;
}

export interface DatabaseStatus {
  name: string;
  status: 'connected' | 'error' | 'degraded';
  latency_ms?: number;
  last_checked: string;
}

export interface BroadcastRecord {
  id: number;
  title: string;
  type: 'email' | 'notification' | 'both';
  target: string;
  sent_count: number;
  status: 'sent' | 'pending' | 'failed';
  created_at: string;
}
