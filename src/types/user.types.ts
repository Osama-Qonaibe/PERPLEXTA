export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'support' | 'user';
  avatar?: string;
  language?: 'ar' | 'en';
  plan?: UserPlan;
  balance?: number;
  kycStatus?: 'pending' | 'verified' | 'rejected';
  createdAt?: string;
}

export interface UserPlan {
  id: string;
  name: string;
  nameAr?: string;
  color?: string;
  limits?: Record<string, number>;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthReady: boolean;
}
