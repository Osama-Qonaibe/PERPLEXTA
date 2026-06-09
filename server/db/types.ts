export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string | null;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'suspended';
  kyc_status: 'none' | 'pending' | 'verified' | 'rejected';
  kyc_required: boolean;
  kyc_rejection_reason: string | null;
  kyc_submitted_at: Date | string | null;
  referred_by: number | null;
  language: string;
  theme: 'light' | 'dark';
  memory: string | null;
  support_notes: string | null;
  custom_instructions: string | null;
  last_active_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
  provider: string;
  avatar: string | null;
}

export interface PasswordReset {
  id: number;
  email: string;
  token: string;
  expires_at: Date | string;
  created_at: Date | string;
}

export interface TokenBlacklist {
  id: number;
  token: string;
  expires_at: Date | string;
  created_at: Date | string;
}

export interface Chat {
  id: number;
  user_id: number | null;
  title: string;
  tool_id: string;
  context_summary: string | null;
  is_pinned: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  tool: string;
}

export interface Message {
  id: number;
  chat_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_id: string | null;
  model: string | null;
  tokens_used: number;
  feedback: number; // SMALLINT
  thinking_steps: any; // JSONB
  citations: any; // JSONB
  follow_ups: any; // JSONB
  generation_time: number | string | null;
  created_at: Date | string;
  tool: string | null;
  is_pinned: boolean;
  updated_at: Date | string;
}

export interface ApiKeyVault {
  id: number;
  provider: string;
  encrypted_key: string;
  daily_budget: number | string;
  used_today: number | string;
  last_reset_date: Date | string;
  models: any; // JSONB
  model_list: any; // JSONB
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  url_key: string | null;
  protocol_config?: any;
}

export interface ToolOrchestrator {
  id: number;
  tool_id: string;
  primary_provider: string | null;
  primary_model: string | null;
  fallback_1_provider: string | null;
  fallback_1_model: string | null;
  fallback_2_provider: string | null;
  fallback_2_model: string | null;
  fallback_3_provider: string | null;
  fallback_3_model: string | null;
  task_description: string | null;
  task_description_ar: string | null;
  is_active: boolean;
  cost_per_usage: number;
  updated_at: Date | string;
  protocol_config?: any;
}

export interface Wallet {
  id: number;
  user_id: number;
  balance: number | string;
  usd_balance: number | string;
  points: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface LedgerTransaction {
  id: number;
  wallet_id: number;
  user_id: number | null;
  amount: number | string;
  points: number;
  transaction_type: string;
  description: string | null;
  reference_id: string | null;
  created_at: Date | string;
}

export interface Referral {
  id: number;
  referrer_id: number;
  referred_id: number;
  reward_paid: boolean;
  commission_earned: number | string;
  created_at: Date | string;
}

export interface ReferralTree {
  id: number;
  user_id: number;
  parent_id: number | null;
  depth: number;
  created_at: Date | string;
}

export interface KycRequest {
  id: number;
  user_id: number;
  full_name: string;
  id_number: string;
  document_type: string;
  document_url: string;
  status: 'pending' | 'verified' | 'rejected';
  notes: string | null;
  submitted_at: Date | string;
  reviewed_at: Date | string | null;
  reviewed_by: number | null;
}

export interface WithdrawalRequest {
  id: number;
  user_id: number;
  amount: number | string;
  method: string;
  details: string | null;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PayoutAccount {
  id: number;
  user_id: number;
  method: string;
  details: string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface EconomySettings {
  id: string; // varchar/text key
  key: string;
  value: string | null;
  updated_at: Date | string;
}

export interface Plan {
  id: string | number;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price_monthly: number | string;
  price_yearly: number | string;
  discount_percent: number;
  features: string | string[]; // Text array or string representation
  color: string | null;
  is_popular: boolean;
  badge: string | null;
  limits: any; // JSONB
  role: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan_id: string | number;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';
  current_period_start: Date | string;
  current_period_end: Date | string;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  title_ar: string;
  message: string;
  message_ar: string;
  type: string;
  is_read: boolean;
  created_at: Date | string;
}

export interface ChatMemory {
  id: number;
  user_id: number;
  content: string;
  importance: number;
  tags: string | string[] | null;
  chat_id: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface UserFile {
  id: number;
  user_id: number;
  chat_id?: number | null;
  file_name: string;
  file_path?: string;
  file_url?: string;
  file_size: number;
  mime_type: string;
  file_type?: string;
  file_content?: string | null;
  extracted_text?: string | null;
  is_analyzed?: boolean;
  metadata?: any;
  created_at: Date | string;
  updated_at?: Date | string;
}

export interface DepositRequest {
  id: number;
  user_id: number;
  amount: number | string;
  currency: string;
  method: string;
  proof_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  admin_id: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}
