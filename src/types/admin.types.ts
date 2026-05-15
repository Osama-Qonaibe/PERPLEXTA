export interface ApiProvider {
  id: string;
  name: string;
  displayName: string;
  status: 'active' | 'missing' | 'invalid' | 'quota_exceeded';
  isActive: boolean;
  budget: number;
  usedToday: number;
  updatedAt: string | null;
}

export interface AdminStats {
  monthlyRevenue: number;
  activeUsersToday: number;
  aiGenerations: number;
  systemHealth: 'optimal' | 'degraded' | 'critical';
}

export interface ActivityLog {
  id: string;
  type: 'ai_generation' | 'system_event';
  action: string;
  user_name: string;
  detail?: string;
  points?: number;
  created_at: string;
}

export interface SecurityAlert {
  id: string;
  alert_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_name?: string;
  user_id?: string;
  created_at: string;
}

export interface ServerHealth {
  cpu: number;
  memory: { used: number; percent: number };
  load: [number, number, number];
}

export interface DatabaseConfig {
  id: string;
  label: string;
  host: string;
  port: number;
  username: string;
  password: string;
  dbName: string;
  status: 'connected' | 'disconnected' | 'error';
}

export interface OrchestratorTool {
  id: string;
  name: string;
  nameAr?: string;
  isActive: boolean;
  primaryProvider: string;
  primaryModel: string;
  fallback1Provider?: string;
  fallback1Model?: string;
  fallback2Provider?: string;
  fallback2Model?: string;
  taskDescription?: string;
}

export interface AdminPlan {
  id: string;
  name: string;
  nameAr?: string;
  monthlyPrice: number;
  annualPrice: number;
  discount: number;
  color?: string;
  badge?: string;
  isActive: boolean;
  limits: Record<string, number>;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  plan?: string;
  planColor?: string;
  balance: number;
  kycStatus?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface WalletTransaction {
  id: string;
  user_name?: string;
  user_email?: string;
  transaction_type: 'credit' | 'debit' | 'referral' | 'subscription';
  amount: number;
  description?: string;
  created_at: string;
}

export interface BroadcastMessage {
  id?: string;
  title: string;
  titleAr?: string;
  body: string;
  bodyAr?: string;
  targetType: 'all' | 'segment' | 'individual';
  targetValue?: string;
  sentAt?: string;
}
