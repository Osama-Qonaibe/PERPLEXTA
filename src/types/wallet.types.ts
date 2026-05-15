export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: string;
}

export interface LedgerTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit' | 'referral_bonus' | 'subscription_payment' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  referenceId?: string;
  createdAt: string;
}

export interface ReferralInfo {
  code: string;
  totalReferrals: number;
  totalEarned: number;
  pendingPayout: number;
}
