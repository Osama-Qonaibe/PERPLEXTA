export interface WalletTransaction {
  id: number;
  type: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  description?: string;
  reference?: string;
}

export interface WithdrawalRequest {
  id: number;
  user_id: number;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  paypal_email?: string;
}

export interface EconomySettings {
  min_withdrawal: number;
  referral_bonus: number;
  welcome_bonus: number;
  conversion_rate: number;
  points_per_dollar: number;
}
