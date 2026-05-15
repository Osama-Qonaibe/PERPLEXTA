export interface UserSubscription {
  plan_id: string;
  status: string;
  created_at?: string;
  current_period_end: string;
  last_period_start?: string;
  plan_name_en: string;
  plan_name_ar?: string;
  billing_period?: string;
  limits: Record<string, number | string>;
  plan_color?: string;
}

export interface User {
  id?: number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  kyc_required?: boolean;
  kyc_status?: 'pending' | 'verified' | 'rejected' | 'none';
  kyc_rejection_reason?: string | null;
  custom_instructions?: string;
  memory?: string;
  subscription?: UserSubscription | null;
  usageStats?: Record<string, number>;
}

export type KycStatus = 'pending' | 'verified' | 'rejected' | 'none';
export type UserRole = 'admin' | 'support' | 'user';
