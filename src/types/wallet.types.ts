export interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  currency: string;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description_en: string;
  description_ar: string;
  metadata?: any;
  created_at: string;
}

export interface Wallet {
  id: number;
  user_id: number;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface EconomySettings {
  referralRewardUSD: number;
  welcomeBonusUSD: number;
  payoutThresholdUSD: number;
  commissionRate: number;
}

export interface Plan {
  id: string;
  name_en: string;
  name_ar: string;
  price_monthly: number;
  price_annual: number;
  annual_discount_percentage: number;
  is_active: boolean;
  color?: string;
  badge_en?: string;
  badge_ar?: string;
  features_en: string[];
  features_ar: string[];
  limits: Record<string, number>;
}
