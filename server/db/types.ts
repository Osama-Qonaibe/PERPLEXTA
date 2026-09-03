
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
  referral_code: string | null;
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
  feedback: number;
  thinking_steps: any;
  citations: any;
  follow_ups: any;
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
  models: any;
  model_list: any;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  url_key: string | null;
  protocol_config: any;
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
  max_history_depth: number;
  updated_at: Date | string;
  protocol_config: any;
}

export interface UserSession {
  id: number;
  user_id: number | null;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  status: 'active' | 'revoked' | 'expired';
  created_at: Date | string;
  expires_at: Date | string;
  last_active_at: Date | string;
}

export interface UserFile {
  id: number;
  user_id: number;
  chat_id: number | null;
  file_name: string;
  file_type: string | null;
  mime_type: string | null;
  file_size: number | null;
  file_url: string | null;
  file_content: string | null;
  metadata: any;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ChatMemory {
  id: number;
  user_id: number;
  chat_id: number | null;
  fact: string;
  source: 'ai' | 'user' | string;
  category: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface Notification {
  id: number;
  user_id: number | null;
  title_en: string;
  title_ar: string;
  message_en: string;
  message_ar: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  metadata: any;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface Plan {
  id: number;
  name_en: string;
  name_ar: string;
  desc_en: string | null;
  desc_ar: string | null;
  badge: string | null;
  discount: number;
  is_active: boolean;
  is_visible: boolean;
  is_popular: boolean;
  monthly_price: number | string;
  annual_price: number | string;
  color: string | null;
  features: any;
  limits: any;
  plan_type: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan_id: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: 'active' | 'expired' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'trialing';
  billing_period: 'monthly' | 'annual';
  current_period_end: Date | string | null;
  last_period_start: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SupportTicket {
  id: number;
  user_id: number | null;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed' | string;
  priority: 'low' | 'medium' | 'high' | string;
  category: string;
  assigned_to: number | null;
  last_reply_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SupportTicketReply {
  id: number;
  ticket_id: number;
  user_id: number | null;
  message: string;
  is_admin_reply: boolean;
  created_at: Date | string;
}

export interface RouteSeoSetting {
  id: number;
  route: string;
  title_ar: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  keywords_ar: string | null;
  keywords_en: string | null;
  og_image_url: string | null;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SystemSettings {
  id: number;
  site_name_en: string;
  site_name_ar: string;
  seo_site_name_en: string | null;
  seo_site_name_ar: string | null;
  logo_url: string | null;
  logo_light_url: string | null;
  favicon_url: string | null;
  site_description_en: string | null;
  site_description_ar: string | null;
  seo_description_en: string | null;
  seo_description_ar: string | null;
  keywords_en: string | null;
  keywords_ar: string | null;
  google_analytics_id: string | null;
  google_site_verification: string | null;
  seo_image_url: string | null;
  stripe_publishable_key: string | null;
  stripe_secret_key: string | null;
  stripe_webhook_secret: string | null;
  stripe_live_mode: boolean;
  stripe_status: string;
  stripe_last_verified_at: Date | string | null;
  paypal_client_id: string | null;
  paypal_client_secret: string | null;
  paypal_mode: 'sandbox' | 'live';
  paypal_status: string;
  paypal_last_verified_at: Date | string | null;
  image_prompt_pref_threshold: number;
  memory_limit_per_user: number;
  quota_warning_threshold_low?: number;
  quota_warning_threshold_high?: number;
  updated_at: Date | string;
}

export interface SystemBroadcast {
  id: number;
  admin_id: number | null;
  broadcast_type: string;
  type: string;
  target_group: string;
  target_role: string;
  title_en: string | null;
  title_ar: string | null;
  content_en: string | null;
  content_ar: string | null;
  status: string;
  sent_count: number;
  created_at: Date | string;
}

export interface SystemLog {
  id: number;
  user_id: number | null;
  action: string | null;
  type: string;
  description: string | null;
  metadata: any;
  ip_address: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SecurityAlert {
  id: number;
  user_id: number | null;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string | null;
  metadata: any;
  is_resolved: boolean;
  ip_address: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface OAuthState {
  id: number;
  state: string;
  provider: string;
  redirect_url: string | null;
  expires_at: Date | string;
  created_at: Date | string;
}

export interface MessageReport {
  id: number;
  user_id: number | null;
  message_id: number | null;
  reason: string | null;
  status: 'pending' | 'reviewed' | 'dismissed' | string;
  created_at: Date | string;
}

export interface UserShortcut {
  id: number;
  user_id: number | null;
  title: string;
  query: string;
  category: string;
  created_at: Date | string;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject_en: string | null;
  subject_ar: string | null;
  body_en: string | null;
  body_ar: string | null;
  type: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface EmailSettings {
  id: number;
  mailer_type: string;
  smtp_host: string | null;
  smtp_port: string | null;
  smtp_encryption: string;
  smtp_username: string | null;
  smtp_password: string | null;
  sender_name: string | null;
  sender_email: string | null;
  status: string;
  last_verified_at: Date | string | null;
  updated_at: Date | string;
}

export interface VideoResource {
  id: number;
  user_id: number | null;
  chat_id: number | null;
  message_id: number | null;
  file_url: string;
  prompt: string | null;
  provider: string | null;
  model: string | null;
  duration: number | null;
  aspect_ratio: string | null;
  resolution: string | null;
  metadata: any;
  created_at: Date | string;
}

export interface RegisteredAgent {
  id: number;
  client_id: string;
  client_secret: string;
  client_name: string | null;
  identity_type: string;
  credential_type: string;
  redirect_uris: string[] | null;
  jwks_uri: string | null;
  user_agent: string | null;
  signature_keys: any;
  user_id: number | null;
  created_at: Date | string;
}

export interface DbConnectionsRegistry {
  id: string;
  provider: string | null;
  type: string;
  host: string | null;
  port: string | null;
  db_name: string | null;
  username: string | null;
  password: string | null;
  connection_string: string | null;
  ssl_mode: string;
  pool_size: number;
  is_active: boolean;
  status: string;
  last_checked_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface MigrationHistory {
  id: number;
  migration_name: string;
  applied_at: Date | string;
}

export interface MigrationSecurityAudit {
  id: number;
  migration_name: string | null;
  status: 'failed' | 'conflict' | 'info';
  error_message: string | null;
  sql_state: string | null;
  details: any;
  created_at: Date | string;
}

export interface UserUsage {
  id: number;
  user_id: number;
  tool_id: string;
  usage_count: number;
  usage_date: Date | string;
  updated_at: Date | string;
}


export interface Wallet {
  id: number;
  user_id: number;
  balance: number | string;
  usd_balance: number | string;
  points: number;
  referral_activated: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface LedgerTransaction {
  id: number;
  wallet_id: number | null;
  user_id: number | null;
  amount: number | string;
  points: number;
  transaction_type: string;
  status: string;
  reference_id: string | null;
  metadata: any;
  ip_address: string | null;
  description: string | null;
  is_hidden: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface Referral {
  id: number;
  referrer_id: number;
  referred_id: number;
  bonus_points: number;
  status: 'pending' | 'active' | 'completed' | string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ReferralTree {
  id: number;
  referrer_id: number;
  referred_id: number;
  level: number;
  commission_earned: number | string;
  status: string;
  created_at: Date | string;
}

export interface KycRequest {
  id: number;
  user_id: number;
  full_name: string | null;
  selfie_url: string | null;
  status: 'pending' | 'verified' | 'rejected';
  rejection_reason: string | null;
  submitted_at: Date | string;
  updated_at: Date | string;
}

export interface WithdrawalRequest {
  id: number;
  user_id: number;
  amount_cents: number;
  method: string;
  details: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  processed_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PayoutAccount {
  id: number;
  user_id: number;
  type: string | null;
  details: string | null;
  updated_at: Date | string;
}

export interface EconomySettings {
  id: number;
  welcome_bonus_points: number;
  referral_bonus_points: number;
  min_withdrawal_cents: number;
  points_per_dollar: number;
  conversion_rate: number | string;
  referral_bonus_percent: number;
  min_payout_usd: number | string;
  min_deposit_usd: number | string;
  referral_activation_min_deposit: number | string;
  crypto_address: string | null;
  bank_name: string | null;
  bank_recipient: string | null;
  bank_iban: string | null;
  bank_swift: string | null;
  paypal_email: string | null;
  updated_at: Date | string;
}

export interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed' | string;
  value: number | string;
  min_purchase: number | string;
  max_discount: number | string | null;
  expires_at: Date | string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: Date | string;
}

export interface CouponUsage {
  id: number;
  coupon_id: number | null;
  user_id: number;
  transaction_id: number | null;
  applied_at: Date | string;
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

export interface StripeEvent {
  id: number;
  stripe_event_id: string | null;
  type: string | null;
  status: string;
  metadata: any;
  created_at: Date | string;
  updated_at: Date | string;
}


export interface ForumCategory {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  icon: string;
  color: string;
  created_at: Date | string;
}

export interface ForumPost {
  id: number;
  category_id: number;
  user_id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  views: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ForumComment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BlogArticle {
  id: number;
  author_id: number;
  slug: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  image_url: string | null;
  category_en: string;
  category_ar: string;
  views: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BlogComment {
  id: number;
  article_id: number;
  user_id: number;
  content: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BlogRating {
  id: number;
  article_id: number;
  user_id: number;
  rating: number;
  created_at: Date | string;
}


export interface AdminAuditLog {
  id: number;
  admin_id: number | null;
  admin_email: string | null;
  action: string;
  target_resource: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date | string;
}


export interface MarketplaceItem {
  id: number;
  user_id: number;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  price: number | string;
  category_en: string;
  category_ar: string;
  image_url: string | null;
  status: 'approved' | 'pending' | 'sold' | 'rejected' | string;
  views: number;
  contact_link: string | null;
  download_url: string | null;
  preview_url: string | null;
  video_url: string | null;
  features: string | null;
  technologies: string | null;
  referral_percent: number | string | null;
  highlight_tag: string | null;
  license_type: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface MarketplacePurchase {
  id: number;
  user_id: number;
  item_id: number;
  price_paid: number | string;
  license_type: string;
  referrer_id: number | null;
  commission_paid: number | string;
  download_token: string | null;
  created_at: Date | string;
}


export interface BulletinPage {
  id: number;
  user_id: number;
  name: string;
  slug?: string;
  category: string;
  city: string;
  address?: string | null;
  description: string;
  avatar_url: string;
  cover_url: string;
  whatsapp_number?: string | null;
  phone_number?: string | null;
  website_url?: string | null;
  is_verified: boolean;
  followers_count: number;
  ads_count: number;
  user_is_following?: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BulletinInquiry {
  id: number;
  page_id?: number | null;
  ad_id?: number | null;
  sender_id: number;
  sender_name: string;
  sender_phone?: string | null;
  message: string;
  status: 'unread' | 'read';
  ad_title?: string;
  page_name?: string;
  created_at: Date | string;
}

export interface MediaGalleryItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption?: string;
  thumbnailUrl?: string;
}

export interface BulletinAd {
  id: number;
  user_id: number;
  page_id?: number | null;
  page_name?: string | null;
  page_avatar?: string | null;
  page_cover?: string | null;
  page_is_verified?: boolean;
  location_city?: string | null;
  author_name?: string;
  author_avatar?: string;
  title: string;
  description: string;
  image_url: string;
  media_gallery?: MediaGalleryItem[];
  metadata?: any;
  whatsapp_number: string | null;
  has_whatsapp_button?: boolean;
  phone_number?: string | null;
  video_url?: string | null;
  target_url: string | null;
  hashtags: string[];
  category: string;
  price_paid: number;
  duration_days: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'archived' | 'trash' | string;
  rejection_reason?: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  clicks_count: number;
  impressions_count: number;
  user_has_liked?: boolean;
  user_has_saved?: boolean;
  is_ai_generated?: boolean;
  feeling?: string | null;
  tagged_users?: string[] | null;
  audience?: 'public' | 'friends' | 'only_me' | string;
  who_can_comment?: 'anyone' | 'followers' | 'mentioned' | 'nobody' | string;
  allow_translation?: boolean;
  is_muted_notifications?: boolean;
  partnership_code?: string | null;
  is_partnership?: boolean;
  partnership_brand?: string | null;
  partnership_label_enabled?: boolean;
  partnership_sponsor_name?: string | null;
  archived_at?: Date | string | null;
  deleted_at?: Date | string | null;
  ad_format?: 'post' | 'reel' | 'story' | string;
  quick_questions?: string[] | null;
  is_boosted?: boolean;
  boosted_until?: Date | string | null;
  boost_tier?: string | null;
  boost_price?: number;
  starts_at?: Date | string | null;
  expires_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface BulletinAdComment {
  id: number;
  ad_id: number;
  user_id: number;
  author_name: string;
  author_avatar: string | null;
  content: string;
  parent_id?: number | null;
  like_count?: number;
  user_reaction?: string | null;
  reactions_summary?: string[];
  replies?: BulletinAdComment[];
  created_at: Date | string;
}


export interface Advertisement {
  id: number;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  image_url: string;
  target_url: string;
  sponsor_name: string | null;
  badge_text_ar: string | null;
  badge_text_en: string | null;
  position: string;
  display_order: number;
  is_active: boolean;
  click_count: number;
  impression_count: number;
  meta_title_ar: string | null;
  meta_title_en: string | null;
  meta_description_ar: string | null;
  meta_description_en: string | null;
  keywords_ar: string | null;
  keywords_en: string | null;
  start_date: Date | string | null;
  end_date: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

