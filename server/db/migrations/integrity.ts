import { pool, ledgerPool, externalPool, securityPool, createInternalPool } from "../index.js";
import { ensureColumnsBulk } from "./helpers.js";
import { decrypt } from "../../utils/crypto.js";
import { getIo } from "./maintenance.js";
import { initDb } from "./index.js";

function safelyDecryptConnectionString(encrypted: string): string {
  try {
    return decrypt(encrypted);
  } catch {
    return "";
  }
}

export async function queryColumns(p: any, schemaName = "public"): Promise<Record<string, Set<string>>> {
  try {
    const res = await p.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = $1
    `, [schemaName]);
    const tables: Record<string, Set<string>> = {};
    for (const row of res.rows) {
      if (!tables[row.table_name]) {
        tables[row.table_name] = new Set();
      }
      tables[row.table_name].add(row.column_name);
    }
    return tables;
  } catch (error) {
    throw new Error(`Failed to query information_schema: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}





let isMonitoring = false;

export async function monitorDatabases() {
  if (isMonitoring) {
    console.warn('[Monitor] Database monitoring already in progress, skipping...');
    return;
  }
  isMonitoring = true;
  try {
    const registries = await pool.query('SELECT * FROM db_connections_registry');
    for (const reg of registries.rows) {
      let isAlive = false;
      let connectionString = '';
      if (reg.connection_string) {
        try {
          connectionString = safelyDecryptConnectionString(reg.connection_string);
        } catch {
          console.warn(`[Monitor] Skipping database ${reg.id} - decryption failed`);
        }
      }

      if (!connectionString || !connectionString.startsWith('postgres')) {
        if (reg.id === 'core') connectionString = process.env.DATABASE_URL || '';
        else if (reg.id === 'ledger') connectionString = process.env.LEDGER_DATABASE_URL || process.env.DATABASE_URL || '';
        else if (reg.id === 'external') connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL || '';
        else if (reg.id === 'security') connectionString = process.env.SECURITY_DATABASE_URL || process.env.DATABASE_URL || '';
      }

      if (!connectionString.startsWith('postgres')) continue;

      const TestPool = createInternalPool(connectionString);
      try {
        await TestPool.query('SELECT 1');
        isAlive = true;
      } catch (e) {
        isAlive = false;
      } finally {
        await TestPool.end();
      }

      await pool.query(
        `UPDATE db_connections_registry SET status = $1, last_checked_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [isAlive ? 'healthy' : 'down', reg.id]
      );
      const io = getIo();
      if (!isAlive && io) io.emit('db_alert', { provider: reg.provider, status: 'down' });
    }
  } catch (error) {
    console.error('[Monitor] Database monitoring failed:', error instanceof Error ? error.message : 'Unknown error');
  } finally {
    isMonitoring = false;
  }
}

export async function verifySchemaIntegrity() {
  if (!pool) {
    console.warn('[Schema Integrity] Skipping validation: No core pool initialized.');
    return;
  }
  console.log('[Schema Integrity] Starting comprehensive database schema audit...');

  const report: {
    passed: boolean;
    missingTables: { db: string; table: string }[];
    missingColumns: { db: string; table: string; column: string; expectedType: string }[];
    repairedTables: string[];
    repairedColumns: string[];
    errors: string[];
  } = {
    passed: true,
    missingTables: [],
    missingColumns: [],
    repairedTables: [],
    repairedColumns: [],
    errors: []
  };

  const queryColumns = async (p: any, schemaName = 'public'): Promise<Record<string, Set<string>>> => {
    try {
      const res = await p.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = $1
      `, [schemaName]);

      const tables: Record<string, Set<string>> = {};
      for (const row of res.rows) {
        if (!tables[row.table_name]) {
          tables[row.table_name] = new Set();
        }
        tables[row.table_name].add(row.column_name);
      }
      return tables;
    } catch (error) {
      throw new Error(`Failed to query information_schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const expectedSchema: Record<string, Record<string, { columns: string[]; repairCols?: Record<string, string | { type: string; default?: any }> }>> = {
    core: {
      users: {
        columns: ['id', 'name', 'email', 'password_hash', 'role', 'status', 'kyc_status', 'kyc_required', 'kyc_rejection_reason', 'kyc_submitted_at', 'referred_by', 'language', 'theme', 'memory', 'support_notes', 'custom_instructions', 'last_active_at', 'created_at', 'updated_at', 'provider', 'avatar', 'referral_code', 'email_notifications', 'avatar_asset_id'],
        repairCols: {
          email_notifications: { type: 'BOOLEAN', default: 'true' },
          avatar: { type: 'TEXT' },
          referral_code: { type: 'VARCHAR(6)' },
          avatar_asset_id: { type: 'UUID' }
        }
      },
      user_sessions: {
        columns: ['id', 'user_id', 'session_token', 'ip_address', 'user_agent', 'status', 'created_at', 'expires_at', 'last_active_at'],
        repairCols: {
          status: { type: 'VARCHAR(20)', default: "'active'" },
          last_active_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
        }
      },
      chats: {
        columns: ['id', 'user_id', 'title', 'tool_id', 'context_summary', 'is_pinned', 'created_at', 'updated_at', 'tool']
      },
      messages: {
        columns: ['id', 'chat_id', 'role', 'content', 'tool_id', 'model', 'tokens_used', 'feedback', 'thinking_steps', 'citations', 'follow_ups', 'generation_time', 'created_at', 'tool', 'is_pinned', 'updated_at']
      },
      api_keys_vault: {
        columns: ['id', 'provider', 'encrypted_key', 'daily_budget', 'used_today', 'last_reset_date', 'models', 'model_list', 'is_active', 'created_at', 'updated_at', 'url_key', 'protocol_config']
      },
      tool_orchestrator: {
        columns: ['id', 'tool_id', 'primary_provider', 'primary_model', 'fallback_1_provider', 'fallback_1_model', 'fallback_2_provider', 'fallback_2_model', 'fallback_3_provider', 'fallback_3_model', 'task_description', 'task_description_ar', 'is_active', 'cost_per_usage', 'updated_at', 'protocol_config', 'max_history_depth', 'cost_per_1k_input_tokens', 'cost_per_1k_output_tokens', 'timeout_seconds', 'custom_headers', 'pricing_rule']
      },
      subscriptions: {
        columns: ['id', 'user_id', 'plan_id', 'stripe_customer_id', 'stripe_subscription_id', 'status', 'billing_period', 'plan_type', 'price', 'limits', 'current_period_end', 'last_period_start', 'updated_at', 'created_at']
      },
      plans: {
        columns: ['id', 'name_en', 'name_ar', 'monthly_price', 'annual_price', 'discount_percent', 'limits', 'tag_en', 'tag_ar', 'color', 'is_active', 'created_at', 'updated_at']
      },
      user_usage: {
        columns: ['id', 'user_id', 'tool_id', 'usage_date', 'count', 'created_at', 'updated_at']
      },
      notifications: {
        columns: ['id', 'user_id', 'type', 'title_en', 'title_ar', 'message_en', 'message_ar', 'is_read', 'created_at', 'metadata']
      },
      chat_memories: {
        columns: ['id', 'user_id', 'chat_id', 'memory_key', 'memory_value', 'created_at', 'updated_at']
      },
      email_templates: {
        columns: ['id', 'name', 'subject_en', 'subject_ar', 'body_en', 'body_ar', 'created_at', 'updated_at']
      },
      email_settings: {
        columns: ['id', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'from_email', 'from_name', 'is_active', 'updated_at']
      },
      message_reports: {
        columns: ['id', 'message_id', 'user_id', 'reason', 'details', 'status', 'created_at', 'updated_at']
      },
      user_shortcuts: {
        columns: ['id', 'user_id', 'title', 'prompt', 'icon', 'color', 'position', 'created_at', 'updated_at']
      },
      user_files: {
        columns: ['id', 'user_id', 'chat_id', 'file_name', 'file_type', 'mime_type', 'file_size', 'file_url', 'file_content', 'extracted_text', 'is_active', 'token_count', 'category', 'tags', 'uploaded_by_role', 'metadata', 'file_version', 'created_at', 'updated_at']
      },
      system_settings: {
        columns: ['id', 'site_name_en', 'site_name_ar', 'description_en', 'description_ar', 'logo_url', 'logo_light_url', 'favicon_url', 'site_description_en', 'site_description_ar', 'seo_description_en', 'seo_description_ar', 'keywords_en', 'keywords_ar', 'theme', 'default_language', 'maintenance_mode', 'allow_registrations', 'security_config', 'support_email', 'social_links', 'custom_css', 'custom_js', 'seo_keywords', 'seo_description', 'analytics_code', 'terms_content', 'privacy_content', 'smtp_config', 'enable_crypto_payments', 'enable_stripe_payments', 'min_deposit_amount', 'max_deposit_amount', 'referral_reward_amount', 'google_analytics_id', 'google_site_verification', 'seo_image_url', 'stripe_publishable_key', 'stripe_secret_key', 'stripe_webhook_secret', 'stripe_live_mode', 'stripe_status', 'stripe_last_verified_at', 'paypal_client_id', 'paypal_client_secret', 'paypal_mode', 'paypal_status', 'paypal_last_verified_at', 'image_prompt_pref_threshold', 'blocked_paths', 'seo_site_name_en', 'seo_site_name_ar', 'font_loading_config', 'font_config_ar', 'font_config_en', 'bulletin_ad_daily_price', 'live_gift_commission_percent', 'sidebar_ad_impression_price', 'sidebar_ad_click_price', 'sidebar_ads_enabled', 'memory_limit_per_user', 'quota_warning_threshold_low', 'quota_warning_threshold_high', 'require_2fa_for_economy', 'updated_at']
      },
      system_logs: {
        columns: ['id', 'user_id', 'level', 'action', 'details', 'ip_address', 'created_at']
      },
      system_broadcasts: {
        columns: ['id', 'admin_id', 'broadcast_type', 'type', 'target_group', 'target_role', 'target_roles', 'priority', 'action_url', 'action_label', 'title_en', 'title_ar', 'content_en', 'content_ar', 'status', 'sent_count', 'created_at']
      },
      oauth_states: {
        columns: ['id', 'state', 'redirect_uri', 'created_at', 'expires_at']
      },
      bulletin_ads: {
        columns: ['id', 'user_id', 'author_name', 'author_avatar', 'title', 'description', 'image_url', 'whatsapp_number', 'target_url', 'hashtags', 'category', 'price_paid', 'duration_days', 'status', 'rejection_reason', 'likes_count', 'comments_count', 'shares_count', 'clicks_count', 'impressions_count', 'view_count', 'click_count', 'is_featured', 'is_pinned', 'priority', 'badge_text', 'cta_label', 'cta_action', 'cta_payload', 'cta_style', 'badge_color', 'tags', 'metadata', 'starts_at', 'expires_at', 'page_id', 'location_city', 'phone_number', 'video_url', 'is_boosted', 'boosted_until', 'boost_tier', 'boost_price', 'audience', 'ad_format', 'quick_questions', 'feeling', 'tagged_users', 'is_ai_generated', 'has_whatsapp_button', 'created_at', 'updated_at'],
        repairCols: {
          meta_title_en: { type: 'VARCHAR(255)' },
          image_asset_id: { type: 'UUID' },
          meta_title_ar: { type: 'VARCHAR(255)' },
          meta_description_en: { type: 'TEXT' },
          meta_description_ar: { type: 'TEXT' },
          keywords_en: { type: 'TEXT' },
          keywords_ar: { type: 'TEXT' },
          og_image_url: { type: 'TEXT' }
        }
      },
      bulletin_saved_ads: {
        columns: ['id', 'user_id', 'ad_id', 'created_at']
      },
      bulletin_reports: {
        columns: ['id', 'user_id', 'ad_id', 'reason', 'details', 'status', 'created_at', 'updated_at']
      },
      bulletin_pages: {
        columns: ['id', 'user_id', 'name', 'slug', 'category', 'city', 'address', 'description', 'avatar_url', 'cover_url', 'whatsapp_number', 'phone_number', 'website_url', 'is_verified', 'is_featured', 'rating', 'review_count', 'view_count', 'followers_count', 'ads_count', 'social_links', 'custom_sections', 'created_at', 'updated_at']
      },
      bulletin_page_followers: {
        columns: ['id', 'user_id', 'page_id', 'created_at']
      },
      bulletin_page_inquiries: {
        columns: ['id', 'user_id', 'page_id', 'ad_id', 'sender_id', 'sender_name', 'sender_phone', 'message', 'status', 'created_at']
      },
      bulletin_ad_likes: {
        columns: ['id', 'user_id', 'ad_id', 'created_at']
      },
      bulletin_ad_comments: {
        columns: ['id', 'user_id', 'ad_id', 'author_name', 'author_avatar', 'content', 'parent_id', 'like_count', 'is_pinned', 'created_at']
      },
      bulletin_ad_messages: {
        columns: ['id', 'ad_id', 'sender_id', 'recipient_id', 'content', 'is_read', 'created_at']
      },
      route_seo_settings: {
        columns: ['id', 'route', 'route_path', 'title_ar', 'title_en', 'description_ar', 'description_en', 'keywords_ar', 'keywords_en', 'og_image', 'og_image_url', 'canonical_url', 'structured_data', 'alt_text_ar', 'alt_text_en', 'is_active', 'created_at', 'updated_at']
      },
      route_seo_metadata: {
        columns: ['route_path', 'title_ar', 'title_en', 'description_ar', 'description_en', 'og_image_url', 'updated_at']
      },
      asset_metadata: {
        columns: ['id', 'asset_id', 'file_url', 'asset_name', 'file_type', 'mime_type', 'byte_size', 'file_size', 'dimensions', 'storage_provider', 'storage_path', 'public_url', 'checksum_sha256', 'tags', 'metadata', 'alt_text_ar', 'alt_text_en', 'og_title_ar', 'og_title_en', 'og_description_ar', 'og_description_en', 'keywords_ar', 'keywords_en', 'visual_summary', 'ai_analysis_raw', 'created_at', 'updated_at']
      },
      user_activity_logs: {
        columns: ['id', 'user_id', 'event_type', 'activity_type', 'description', 'event_details', 'metadata', 'ip_address', 'user_agent', 'created_at'],
        repairCols: {
          event_type: { type: 'VARCHAR(100)', default: "'unknown'" },
          event_details: { type: 'JSONB', default: "'{}'" },
          ip_address: { type: 'VARCHAR(100)' },
          user_agent: { type: 'TEXT' },
          created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
        }
      },
      marketplace_items: {
        columns: ['id', 'user_id', 'seller_id', 'title', 'title_en', 'title_ar', 'description', 'description_en', 'description_ar', 'category', 'category_en', 'category_ar', 'price', 'price_credits', 'price_usd', 'image_url', 'image_asset_id', 'asset_id', 'rating', 'sales_count', 'is_published', 'metadata', 'status', 'views', 'contact_link', 'download_url', 'preview_url', 'video_url', 'features', 'technologies', 'referral_percent', 'highlight_tag', 'license_type', 'created_at', 'updated_at'],
        repairCols: {
          slug: { type: 'VARCHAR(255)' },
          meta_title_en: { type: 'VARCHAR(255)' },
          meta_title_ar: { type: 'VARCHAR(255)' },
          meta_description_en: { type: 'TEXT' },
          meta_description_ar: { type: 'TEXT' },
          keywords_en: { type: 'TEXT' },
          keywords_ar: { type: 'TEXT' },
          og_image_url: { type: 'TEXT' }
        }
      },
      marketplace_purchases: {
        columns: ['id', 'user_id', 'item_id', 'price_paid', 'currency', 'transaction_id', 'status', 'license_type', 'referrer_id', 'commission_paid', 'download_token', 'created_at']
      },
      marketplace_reviews: {
        columns: ['id', 'user_id', 'item_id', 'rating', 'comment', 'review_text', 'created_at', 'updated_at']
      },
      video_resources: {
        columns: ['id', 'user_id', 'chat_id', 'message_id', 'file_url', 'prompt', 'provider', 'model', 'duration', 'aspect_ratio', 'resolution', 'metadata', 'storage_provider', 'video_codec', 'audio_codec', 'bitrate_kbps', 'fps', 'has_subtitles', 'is_processed', 'transcode_status', 'error_log', 'created_at']
      },
      referral_invitations: {
        columns: ['id', 'referrer_id', 'email', 'status', 'subject', 'body', 'referred_email', 'invite_code', 'created_at', 'updated_at']
      },
      shared_snapshots: {
        columns: ['id', 'user_id', 'title', 'content', 'model_name', 'created_at', 'views_count']
      },
      gift_catalog: {
        columns: ['id', 'name_ar', 'name_en', 'icon', 'points', 'is_active', 'created_at', 'updated_at']
      },
      google_tool_connections: {
        columns: ['id', 'user_id', 'tool_id', 'is_connected', 'config', 'access_token', 'refresh_token', 'expires_at', 'scopes', 'last_connected_at', 'created_at', 'updated_at']
      },
      media_assets: {
        columns: ['id', 'stored_path', 'original_filename', 'context', 'format', 'width', 'height', 'size_bytes', 'sha256_hash', 'is_public', 'user_id', 'blog_article_id', 'marketplace_item_id', 'metadata', 'created_at', 'updated_at'],
        repairCols: {
          context: { type: 'TEXT', default: "'general'" },
          format: { type: 'TEXT', default: "'webp'" },
          metadata: { type: 'JSONB', default: "'{}'" }
        }
      },
      advertisements: {
        columns: ['id', 'title_ar', 'title_en', 'description_ar', 'description_en', 'image_url', 'video_url', 'poster_url', 'target_url', 'sponsor_name', 'badge_text_ar', 'badge_text_en', 'position', 'format', 'display_order', 'is_active', 'meta_title_ar', 'meta_title_en', 'meta_description_ar', 'meta_description_en', 'keywords_ar', 'keywords_en', 'click_count', 'impression_count', 'start_date', 'end_date', 'created_at', 'updated_at'],
        repairCols: {
          video_url: { type: 'TEXT' },
          poster_url: { type: 'TEXT' },
          format: { type: 'VARCHAR(50)', default: "'sidebar'" },
          meta_title_ar: { type: 'VARCHAR(255)' },
          meta_title_en: { type: 'VARCHAR(255)' },
          meta_description_ar: { type: 'TEXT' },
          meta_description_en: { type: 'TEXT' },
          keywords_ar: { type: 'TEXT' },
          keywords_en: { type: 'TEXT' },
          click_count: { type: 'INTEGER', default: 0 },
          impression_count: { type: 'INTEGER', default: 0 },
          start_date: { type: 'TIMESTAMP' },
          end_date: { type: 'TIMESTAMP' },
          created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
          updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
        }
      },
      user_recommendation_interactions: {
        columns: ['id', 'user_id', 'item_type', 'item_id', 'item_key', 'action', 'weight', 'created_at']
      },
      user_recommendation_preferences: {
        columns: ['id', 'user_id', 'preferred_categories', 'preferred_tools', 'updated_at']
      },
      recommendation_feedback: {
        columns: ['id', 'user_id', 'item_type', 'item_id', 'item_key', 'feedback_type', 'created_at']
      },
      support_tickets: {
        columns: ['id', 'user_id', 'subject', 'category', 'priority', 'status', 'created_at', 'updated_at']
      },
      support_ticket_replies: {
        columns: ['id', 'ticket_id', 'user_id', 'message', 'is_admin', 'is_internal', 'created_at']
      },
      password_resets: {
        columns: ['id', 'user_id', 'token', 'expires_at', 'created_at']
      },
      model_cost_audit_logs: {
        columns: ['id', 'user_id', 'tool_id', 'provider', 'model', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'cost_usd', 'cost_credits', 'status', 'error_message', 'created_at']
      },
      admin_approval_queue: {
        columns: ['id', 'requester_id', 'action_type', 'payload', 'status', 'verification_code', 'approver_id', 'rejection_reason', 'created_at', 'updated_at']
      },
      ad_pricing_audit: {
        columns: ['id', 'admin_id', 'field_name', 'old_value', 'new_value', 'change_type', 'created_at']
      },
      ad_stats: {
        columns: ['id', 'ad_id', 'type', 'ip_address', 'user_agent', 'created_at']
      },
      db_connections_registry: {
        columns: ['id', 'provider', 'type', 'host', 'port', 'db_name', 'username', 'password', 'connection_string', 'ssl_mode', 'pool_size', 'is_active', 'status', 'last_checked_at', 'created_at', 'updated_at']
      }
    },
    ledger: {
      wallets: {
        columns: ['id', 'user_id', 'balance', 'usd_balance', 'points', 'created_at', 'updated_at', 'referral_activated']
      },
      ledger_transactions: {
        columns: ['id', 'wallet_id', 'user_id', 'amount', 'points', 'transaction_type', 'status', 'reference_id', 'metadata', 'ip_address', 'description', 'is_hidden', 'created_at', 'updated_at']
      },
      referrals: {
        columns: ['id', 'referrer_id', 'referred_id', 'status', 'reward_amount', 'created_at', 'updated_at']
      },
      referral_tree: {
        columns: ['id', 'ancestor_id', 'descendant_id', 'depth', 'created_at']
      },
      kyc_requests: {
        columns: ['id', 'user_id', 'full_name', 'nationality', 'document_type', 'document_number', 'document_front_url', 'document_back_url', 'selfie_url', 'status', 'rejection_reason', 'reviewed_by', 'reviewed_at', 'created_at']
      },
      withdrawal_requests: {
        columns: ['id', 'user_id', 'amount', 'payout_method', 'payout_details', 'status', 'rejection_reason', 'processed_by', 'processed_at', 'transaction_hash', 'created_at']
      },
      payout_accounts: {
        columns: ['id', 'user_id', 'payout_method', 'account_identifier', 'details', 'is_default', 'created_at']
      },
      economy_settings: {
        columns: ['id', 'welcome_bonus_points', 'referral_bonus_points', 'min_withdrawal_cents', 'points_per_dollar', 'conversion_rate', 'referral_bonus_percent', 'min_payout_usd', 'min_deposit_usd', 'referral_activation_min_deposit', 'crypto_address', 'bank_name', 'bank_recipient', 'bank_iban', 'bank_swift', 'paypal_email', 'updated_at']
      },
      coupons: {
        columns: ['id', 'code', 'discount_percent', 'discount_amount', 'max_uses', 'used_count', 'expires_at', 'is_active', 'created_at']
      },
      coupon_usages: {
        columns: ['id', 'coupon_id', 'user_id', 'used_at']
      },
      stripe_events: {
        columns: ['id', 'stripe_event_id', 'type', 'status', 'metadata', 'created_at', 'updated_at']
      },
      deposit_requests: {
        columns: ['id', 'user_id', 'amount', 'currency', 'method', 'proof_url', 'status', 'rejection_reason', 'admin_id', 'created_at', 'updated_at']
      }
    },
    external: {
      blog_articles: {
        columns: ['id', 'author_id', 'slug', 'title_en', 'title_ar', 'content_en', 'content_ar', 'image_url', 'category_en', 'category_ar', 'views', 'created_at', 'updated_at', 'meta_title_en', 'meta_title_ar', 'meta_description_en', 'meta_description_ar', 'keywords_en', 'keywords_ar', 'og_image_url', 'image_asset_id'],
        repairCols: {
          meta_title_en: { type: 'VARCHAR(255)' },
          meta_title_ar: { type: 'VARCHAR(255)' },
          meta_description_en: { type: 'TEXT' },
          meta_description_ar: { type: 'TEXT' },
          keywords_en: { type: 'TEXT' },
          keywords_ar: { type: 'TEXT' },
          og_image_url: { type: 'TEXT' }
        }
      },
      blog_comments: {
        columns: ['id', 'article_id', 'user_id', 'content', 'created_at', 'updated_at']
      },
      blog_ratings: {
        columns: ['id', 'article_id', 'user_id', 'rating', 'created_at']
      }
    },
    security: {
      token_blacklist: {
        columns: ['id', 'token', 'expires_at', 'created_at']
      },
      security_alerts: {
        columns: ['id', 'user_id', 'type', 'severity', 'description', 'metadata', 'is_resolved', 'ip_address', 'created_at', 'updated_at']
      },
      admin_audit_logs: {
        columns: ['id', 'admin_id', 'admin_email', 'action', 'target_resource', 'details', 'ip_address', 'user_agent', 'created_at']
      },
      registered_agents: {
        columns: ['id', 'client_id', 'client_secret', 'api_key_hash', 'client_name', 'identity_type', 'credential_type', 'redirect_uris', 'jwks_uri', 'user_agent', 'signature_keys', 'permissions', 'is_active', 'user_id', 'created_at']
      }
    }
  };

  const verifyDbGroup = async (groupName: 'core' | 'ledger' | 'external' | 'security', targetPoolObj: any) => {
    if (!targetPoolObj) return;
    try {
      const activeTables = await queryColumns(targetPoolObj);
      const expectedTables = expectedSchema[groupName];

      for (const [tableName, spec] of Object.entries(expectedTables)) {
        if (!activeTables[tableName]) {
          report.passed = false;
          report.missingTables.push({ db: groupName, table: tableName });
          console.warn(`[Schema Integrity] Missing table: ${tableName} in database group ${groupName}`);

          try {
            console.log(`[Schema Integrity] Attempting table reconstruction for ${tableName}...`);
            await initDb('additive', pool, ledgerPool);
            report.repairedTables.push(tableName);
            console.log(`[Schema Integrity] Table ${tableName} reconstructed successfully.`);
          } catch (repairErr) {
            console.error(`[Schema Integrity] Reconstruction failed for table ${tableName}:`, repairErr instanceof Error ? repairErr.message : 'Unknown error');
          }
          continue;
        }

        const activeCols = activeTables[tableName];
        for (const colName of spec.columns) {
          if (!activeCols.has(colName)) {
            report.passed = false;
            const rCol = spec.repairCols?.[colName];
            const expectedTypeStr = typeof rCol === 'string' ? rCol : (rCol ? `${rCol.type}${rCol.default !== undefined ? ' DEFAULT ' + rCol.default : ''}` : 'VARCHAR');
            report.missingColumns.push({
              db: groupName,
              table: tableName,
              column: colName,
              expectedType: expectedTypeStr
            });
            console.warn(`[Schema Integrity] Missing column: ${tableName}.${colName} in database group ${groupName}`);

            if (rCol) {
              try {
                const colConfig = typeof rCol === 'string' ? { type: rCol } : rCol;
                await ensureColumnsBulk(targetPoolObj, tableName, {
                  [colName]: colConfig
                });
                report.repairedColumns.push(`${tableName}.${colName}`);
                console.log(`[Schema Integrity] Column ${tableName}.${colName} added successfully.`);
              } catch (repairErr) {
                console.error(`[Schema Integrity] Column repair failed for ${tableName}.${colName}:`, repairErr instanceof Error ? repairErr.message : 'Unknown error');
              }
            }
          }
        }
      }
    } catch (error) {
      report.passed = false;
      report.errors.push(`${groupName} DB: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`[Schema Integrity] Error auditing database group ${groupName}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  };

  await verifyDbGroup('core', pool);
  await verifyDbGroup('ledger', ledgerPool || pool);
  await verifyDbGroup('external', externalPool || pool);
  await verifyDbGroup('security', securityPool || pool);

  if (report.passed) {
    console.log('[Schema Integrity] All expected tables and columns verified successfully across all active pools!');
  } else {
    console.warn(`[Schema Integrity] Schema verification detected deviations:`, {
      missingTables: report.missingTables.length,
      missingColumns: report.missingColumns.length,
      repairedTables: report.repairedTables.length,
      repairedColumns: report.repairedColumns.length
    });
  }

  try {
    await pool.query(`
      INSERT INTO migration_security_audit (migration_name, status, error_message, details)
      VALUES ($1, $2, $3, $4)
    `, [
      'schema_integrity_audit_verification',
      report.passed ? 'info' : 'conflict',
      report.passed ? 'No anomalies detected.' : `Detected missing tables/columns. Repaired: ${report.repairedColumns.length + report.repairedTables.length}`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        passed: report.passed,
        missingTables: report.missingTables,
        missingColumns: report.missingColumns,
        repairedTables: report.repairedTables,
        repairedColumns: report.repairedColumns,
        errors: report.errors
      })
    ]);
  } catch (dbErr) {
    console.error('[Schema Integrity] Failed to write audit record to migration_security_audit:', dbErr instanceof Error ? dbErr.message : 'Unknown error');
  }
}
