export type DatabasePoolKey = 'core' | 'ledger' | 'external' | 'security';

export type QueryClient = any;

export interface WrappedClient {
  query: (text: string, params?: any[]) => Promise<any>;
  release?: () => void;
}

export interface MigrationMetrics {
  total: number;
  successful: number;
  failed: number;
  totalDuration: number;
  perMigration: Map<string, { duration: number; status: 'success' | 'failed' }>;
}

export interface SchemaTable {
  name: string;
  query: string;
  poolKey: DatabasePoolKey;
}

export interface IndexDefinition {
  poolKey: DatabasePoolKey;
  query: string;
}

export interface ForeignKeyRelation {
  table: string;
  constraint: string;
  column: string;
  ref: string;
  refColumn?: string;
  onDelete?: string;
}

export interface ColumnRepairSpec {
  type: string;
  default?: any;
}

export interface ExpectedTableSchema {
  columns: string[];
  repairCols?: Record<string, string | ColumnRepairSpec>;
}

export type ExpectedDatabaseSchema = Record<DatabasePoolKey, Record<string, ExpectedTableSchema>>;

export const TABLE_POOL_REGISTRY: Record<string, DatabasePoolKey> = {
  // Core DB Tables
  users: 'core',
  user_sessions: 'core',
  chats: 'core',
  messages: 'core',
  api_keys_vault: 'core',
  tool_orchestrator: 'core',
  google_tool_connections: 'core',
  plans: 'core',
  subscriptions: 'core',
  user_usage: 'core',
  notifications: 'core',
  chat_memories: 'core',
  email_templates: 'core',
  email_settings: 'core',
  message_reports: 'core',
  user_shortcuts: 'core',
  system_settings: 'core',
  gift_catalog: 'core',
  system_broadcasts: 'core',
  user_files: 'core',
  system_logs: 'core',
  user_activity_logs: 'core',
  oauth_states: 'core',
  marketplace_items: 'core',
  marketplace_purchases: 'core',
  marketplace_reviews: 'core',
  video_resources: 'core',
  referral_invitations: 'core',
  shared_snapshots: 'core',
  advertisements: 'core',
  bulletin_ads: 'core',
  bulletin_saved_ads: 'core',
  bulletin_reports: 'core',
  bulletin_pages: 'core',
  bulletin_page_followers: 'core',
  bulletin_page_inquiries: 'core',
  bulletin_ad_likes: 'core',
  bulletin_ad_comments: 'core',
  bulletin_ad_messages: 'core',
  route_seo_settings: 'core',
  route_seo_metadata: 'core',
  asset_metadata: 'core',
  user_recommendation_interactions: 'core',
  user_recommendation_preferences: 'core',
  recommendation_feedback: 'core',
  support_tickets: 'core',
  support_ticket_replies: 'core',
  password_resets: 'core',
  media_assets: 'core',
  model_cost_audit_logs: 'core',
  admin_approval_queue: 'core',
  ad_pricing_audit: 'core',
  ad_stats: 'core',
  db_connections_registry: 'core',
  migration_history: 'core',
  migration_security_audit: 'core',

  // Ledger DB Tables
  wallets: 'ledger',
  ledger_transactions: 'ledger',
  referrals: 'ledger',
  referral_tree: 'ledger',
  kyc_requests: 'ledger',
  withdrawal_requests: 'ledger',
  payout_accounts: 'ledger',
  economy_settings: 'ledger',
  coupons: 'ledger',
  coupon_usages: 'ledger',
  deposit_requests: 'ledger',
  stripe_events: 'ledger',

  // External DB Tables
  blog_articles: 'external',
  blog_comments: 'external',
  blog_ratings: 'external',

  // Security DB Tables
  security_alerts: 'security',
  token_blacklist: 'security',
  admin_audit_logs: 'security',
  registered_agents: 'security'
};

export function hashStringToAdvisoryLockKey(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
