export interface AdminStats {
  monthlyRevenue: number;
  activeUsersToday: number;
  aiGenerations: number;
  systemHealth: string;
}

export interface ActivityLog {
  id: string;
  type: "ai_generation" | "system_event";
  action: string;
  user_name: string;
  detail: string;
  points: number;
  created_at: string;
}

export interface SecurityAlert {
  id: string;
  alert_type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  user_name: string;
  user_id: string;
  created_at: string;
}

export interface ServerHealth {
  cpu: number;
  memory: { used: number; percent: number };
  load: number[];
}

export interface FinancialTransaction {
  id: string;
  user_name: string;
  description: string;
  transaction_type: string;
  amount: number;
  created_at: string;
  wallet_id?: string;
  user_id?: string;
}

export interface RadarStats {
  total_liquidity: number;
  transaction_count: number;
  volume_24h: number;
  health_score: number;
}

export interface WalletDiagnostic {
  user_id: string;
  user: { name: string };
  balance: number;
  expected_balance: number;
}

export interface WalletAlert {
  id: string;
  user_id: string;
  user_name: string;
  alert_type: "withdrawal_request" | "kyc_request" | "high_value";
  amount: number;
  created_at: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "suspended" | "pending";
  balance: number;
  points: number;
  created_at: string;
  last_login?: string;
  kyc_status: "pending" | "verified" | "rejected" | "none";
}

export interface AdminPlan {
  id: string;
  name: string;
  name_ar: string;
  price_monthly: number;
  price_yearly: number;
  discount_percentage: number;
  active: boolean;
  color: string;
  features: string[];
  features_ar: string[];
}

export interface ApiKeyRecord {
  id: string;
  provider: string;
  key_name: string;
  is_active: boolean;
  last_used?: string;
  quota_limit: number;
  quota_used: number;
}

export interface ModelRoute {
  tool_id: string;
  tool_name: string;
  primary_model: string;
  primary_provider: string;
  fallback_1_model?: string;
  fallback_1_provider?: string;
  fallback_2_model?: string;
  fallback_2_provider?: string;
  is_active: boolean;
}

export interface SiteSettings {
  siteName: string;
  siteNameAr: string;
  siteDescription: string;
  siteDescriptionAr: string;
  seoDescriptionEn: string;
  seoDescriptionAr: string;
  keywordsEn: string;
  keywordsAr: string;
  googleAnalyticsId: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  logoBase64?: string;
  faviconBase64?: string;
}
