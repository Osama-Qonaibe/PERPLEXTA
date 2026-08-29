import bcrypt from 'bcryptjs';
import type { QueryClient, ForeignKeyRelation } from './types.js';
import { ensureColumnsBulk, ensureForeignKey } from './helpers.js';

export const CORE_SCHEMA_TABLES: { name: string; query: string }[] = [
  {
    name: 'media_assets',
    query: `CREATE TABLE IF NOT EXISTS media_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stored_path TEXT NOT NULL UNIQUE,
        original_filename TEXT NOT NULL,
        context TEXT NOT NULL DEFAULT 'general' CHECK (context IN ('avatar', 'blog', 'marketplace', 'bulletin', 'ad', 'system', 'general')),
        format TEXT NOT NULL DEFAULT 'webp',
        width INT NOT NULL DEFAULT 0,
        height INT NOT NULL DEFAULT 0,
        size_bytes INT NOT NULL DEFAULT 0,
        sha256_hash TEXT NOT NULL UNIQUE,
        is_public BOOLEAN DEFAULT FALSE,
        user_id INTEGER,
        blog_article_id INTEGER,
        marketplace_item_id INTEGER,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'users',
    query: `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT,
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(50) DEFAULT 'active',
        kyc_status VARCHAR(50) DEFAULT 'none',
        kyc_required BOOLEAN DEFAULT false,
        kyc_rejection_reason TEXT,
        kyc_submitted_at TIMESTAMP,
        referred_by INTEGER,
        language VARCHAR(5) DEFAULT 'en',
        theme VARCHAR(10) DEFAULT 'dark',
        memory TEXT,
        support_notes TEXT,
        custom_instructions TEXT,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        provider VARCHAR(50) DEFAULT 'local',
        avatar TEXT,
        avatar_asset_id UUID,
        referral_code VARCHAR(6),
        email_notifications BOOLEAN DEFAULT true
      )`
  },
  {
    name: 'password_resets',
    query: `CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'chats',
    query: `CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title VARCHAR(255) DEFAULT 'New Analysis',
        tool_id VARCHAR(100) DEFAULT 'chat',
        context_summary TEXT,
        is_pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tool VARCHAR(100) DEFAULT 'chat'
      )`
  },
  {
    name: 'messages',
    query: `CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        tool_id VARCHAR(100),
        model VARCHAR(255),
        tokens_used INTEGER DEFAULT 0,
        feedback SMALLINT DEFAULT 0,
        thinking_steps JSONB DEFAULT '[]',
        citations JSONB DEFAULT '[]',
        follow_ups JSONB DEFAULT '[]',
        generation_time NUMERIC,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tool VARCHAR(100),
        is_pinned BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'api_keys_vault',
    query: `CREATE TABLE IF NOT EXISTS api_keys_vault (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(100) NOT NULL CONSTRAINT api_keys_vault_provider_key UNIQUE,
        encrypted_key TEXT NOT NULL,
        daily_budget NUMERIC(15, 4) DEFAULT '0',
        used_today NUMERIC(15, 4) DEFAULT '0',
        last_reset_date DATE DEFAULT CURRENT_DATE,
        models JSONB DEFAULT '[]',
        model_list JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        url_key TEXT,
        protocol_config JSONB DEFAULT '{}'
      )`
  },
  {
    name: 'tool_orchestrator',
    query: `CREATE TABLE IF NOT EXISTS tool_orchestrator (
        id SERIAL PRIMARY KEY,
        tool_id VARCHAR(100) UNIQUE NOT NULL,
        primary_provider VARCHAR(100),
        primary_model VARCHAR(255),
        fallback_1_provider VARCHAR(100),
        fallback_1_model VARCHAR(255),
        fallback_2_provider VARCHAR(100),
        fallback_2_model VARCHAR(255),
        fallback_3_provider VARCHAR(100),
        fallback_3_model VARCHAR(255),
        task_description TEXT,
        task_description_ar TEXT,
        is_active BOOLEAN DEFAULT true,
        cost_per_usage INTEGER DEFAULT 10,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        protocol_config JSONB DEFAULT '{}',
        max_history_depth INTEGER DEFAULT 16,
        cost_per_1k_input_tokens INTEGER DEFAULT 5,
        cost_per_1k_output_tokens INTEGER DEFAULT 15
      )`
  },
  {
    name: 'google_tool_connections',
    query: `CREATE TABLE IF NOT EXISTS google_tool_connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tool_id VARCHAR(100) NOT NULL,
        is_connected BOOLEAN DEFAULT false,
        config JSONB DEFAULT '{}',
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        scopes TEXT[],
        last_connected_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, tool_id)
      )`
  },
  {
    name: 'support_tickets',
    query: `CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open',
        priority VARCHAR(20) DEFAULT 'medium',
        category VARCHAR(50) DEFAULT 'general',
        assigned_to INTEGER,
        last_reply_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'support_ticket_replies',
    query: `CREATE TABLE IF NOT EXISTS support_ticket_replies (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        is_admin_reply BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'plans',
    query: `CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL CONSTRAINT plans_name_en_key UNIQUE,
        name_ar VARCHAR(255) NOT NULL,
        desc_en TEXT,
        desc_ar TEXT,
        badge VARCHAR(50) DEFAULT 'none',
        discount INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        is_visible BOOLEAN DEFAULT true,
        is_popular BOOLEAN DEFAULT false,
        monthly_price NUMERIC(10, 2) NOT NULL,
        annual_price NUMERIC(10, 2) NOT NULL,
        color VARCHAR(50) DEFAULT 'accent',
        features JSONB DEFAULT '[]',
        limits JSONB DEFAULT '{}',
        plan_type VARCHAR(100) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'subscriptions',
    query: `CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES plans(id),
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        billing_period VARCHAR(20) DEFAULT 'monthly',
        current_period_end TIMESTAMP,
        last_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'user_usage',
    query: `CREATE TABLE IF NOT EXISTS user_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        tool_id VARCHAR(50) NOT NULL,
        usage_count INTEGER DEFAULT 0,
        usage_date DATE DEFAULT CURRENT_DATE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT user_usage_user_id_tool_id_usage_date_key UNIQUE(user_id, tool_id, usage_date)
      )`
  },
  {
    name: 'notifications',
    query: `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title_en VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255) NOT NULL,
        message_en TEXT NOT NULL,
        message_ar TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        action_url TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'chat_memories',
    query: `CREATE TABLE IF NOT EXISTS chat_memories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
        fact TEXT NOT NULL,
        source VARCHAR(20) DEFAULT 'ai',
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'email_templates',
    query: `CREATE TABLE IF NOT EXISTS email_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        subject_en VARCHAR(255),
        subject_ar VARCHAR(255),
        body_en TEXT,
        body_ar TEXT,
        type VARCHAR(50) DEFAULT 'custom',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'email_settings',
    query: `CREATE TABLE IF NOT EXISTS email_settings (
        id SERIAL PRIMARY KEY,
        mailer_type VARCHAR(50) DEFAULT 'smtp',
        smtp_host VARCHAR(255),
        smtp_port VARCHAR(10),
        smtp_encryption VARCHAR(50) DEFAULT 'tls',
        smtp_username VARCHAR(255),
        smtp_password TEXT,
        sender_name VARCHAR(255),
        sender_email VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        last_verified_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'message_reports',
    query: `CREATE TABLE IF NOT EXISTS message_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        message_id INTEGER,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'user_shortcuts',
    query: `CREATE TABLE IF NOT EXISTS user_shortcuts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        query TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'system_settings',
    query: `CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        site_name_en VARCHAR(255) DEFAULT 'Premium AI',
        site_name_ar VARCHAR(255) DEFAULT 'منصة النخبة',
        logo_url TEXT,
        logo_light_url TEXT,
        favicon_url TEXT,
        site_description_en TEXT,
        site_description_ar TEXT,
        seo_description_en TEXT,
        seo_description_ar TEXT,
        keywords_en TEXT,
        keywords_ar TEXT,
        google_analytics_id VARCHAR(100),
        google_site_verification VARCHAR(255),
        seo_image_url TEXT,
        stripe_publishable_key TEXT,
        stripe_secret_key TEXT,
        stripe_webhook_secret TEXT,
        stripe_live_mode BOOLEAN DEFAULT false,
        stripe_status VARCHAR(50) DEFAULT 'pending',
        stripe_last_verified_at TIMESTAMP,
        paypal_client_id TEXT,
        paypal_client_secret TEXT,
        paypal_mode VARCHAR(20) DEFAULT 'sandbox',
        paypal_status VARCHAR(50) DEFAULT 'pending',
        paypal_last_verified_at TIMESTAMP,
        image_prompt_pref_threshold INTEGER DEFAULT 150,
        blocked_paths TEXT DEFAULT '',
        seo_site_name_en TEXT,
        seo_site_name_ar TEXT,
        font_loading_config TEXT,
        font_config_ar TEXT,
        font_config_en TEXT,
        bulletin_ad_daily_price NUMERIC(10,2) DEFAULT 5.00,
        live_gift_commission_percent INTEGER DEFAULT 30,
        sidebar_ad_impression_price NUMERIC(10,4) DEFAULT 0.0100,
        sidebar_ad_click_price NUMERIC(10,2) DEFAULT 0.10,
        sidebar_ads_enabled BOOLEAN DEFAULT TRUE,
        memory_limit_per_user INTEGER DEFAULT 50,
        quota_warning_threshold_low INTEGER DEFAULT 50,
        quota_warning_threshold_high INTEGER DEFAULT 80,
        require_2fa_for_economy BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'gift_catalog',
    query: `CREATE TABLE IF NOT EXISTS gift_catalog (
        id SERIAL PRIMARY KEY,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        icon TEXT NOT NULL,
        points INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'system_broadcasts',
    query: `CREATE TABLE IF NOT EXISTS system_broadcasts (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER REFERENCES users(id),
        broadcast_type VARCHAR(50) DEFAULT 'system',
        type VARCHAR(50) DEFAULT 'system',
        target_group VARCHAR(50) DEFAULT 'all',
        target_role VARCHAR(20) DEFAULT 'all',
        title_en VARCHAR(255),
        title_ar VARCHAR(255),
        content_en TEXT,
        content_ar TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        sent_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'user_files',
    query: `CREATE TABLE IF NOT EXISTS user_files (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chat_id INTEGER REFERENCES chats(id) ON DELETE SET NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100),
        mime_type VARCHAR(100),
        file_size INTEGER,
        file_url TEXT,
        file_content TEXT,
        metadata JSONB DEFAULT '{}',
        file_version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'system_logs',
    query: `CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(255),
        type VARCHAR(100) DEFAULT 'info',
        description TEXT,
        details JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'user_activity_logs',
    query: `CREATE TABLE IF NOT EXISTS user_activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(100) NOT NULL,
        event_details JSONB DEFAULT '{}',
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'oauth_states',
    query: `CREATE TABLE IF NOT EXISTS oauth_states (
        id SERIAL PRIMARY KEY,
        state VARCHAR(255) UNIQUE NOT NULL,
        provider VARCHAR(50) NOT NULL,
        redirect_url TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'marketplace_items',
    query: `CREATE TABLE IF NOT EXISTS marketplace_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title_en VARCHAR(255) NOT NULL,
        title_ar VARCHAR(255) NOT NULL,
        description_en TEXT NOT NULL,
        description_ar TEXT NOT NULL,
        price NUMERIC(15, 2) NOT NULL,
        category_en VARCHAR(100) NOT NULL,
        category_ar VARCHAR(100) NOT NULL,
        image_url TEXT,
        image_asset_id UUID,
        status VARCHAR(20) DEFAULT 'approved',
        views INTEGER DEFAULT 0,
        contact_link TEXT,
        download_url TEXT,
        preview_url TEXT,
        video_url TEXT,
        features TEXT,
        technologies TEXT,
        referral_percent NUMERIC(5,2),
        highlight_tag VARCHAR(50),
        license_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'marketplace_purchases',
    query: `CREATE TABLE IF NOT EXISTS marketplace_purchases (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
        price_paid NUMERIC(10, 2) NOT NULL,
        license_type VARCHAR(50) DEFAULT 'standard',
        referrer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        commission_paid NUMERIC(10, 2) DEFAULT 0.00,
        download_token VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'marketplace_reviews',
    query: `CREATE TABLE IF NOT EXISTS marketplace_reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id INTEGER NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'video_resources',
    query: `CREATE TABLE IF NOT EXISTS video_resources (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        chat_id INTEGER,
        message_id INTEGER,
        file_url TEXT NOT NULL,
        prompt TEXT,
        provider VARCHAR(100),
        model VARCHAR(100),
        duration INTEGER,
        aspect_ratio VARCHAR(50),
        resolution VARCHAR(50),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'referral_invitations',
    query: `CREATE TABLE IF NOT EXISTS referral_invitations (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'sent',
        subject VARCHAR(255),
        body TEXT,
        referred_email VARCHAR(255),
        invite_code VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'shared_snapshots',
    query: `CREATE TABLE IF NOT EXISTS shared_snapshots (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title TEXT,
        content TEXT NOT NULL,
        model_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        views_count INTEGER DEFAULT 0
      )`
  },
  {
    name: 'advertisements',
    query: `CREATE TABLE IF NOT EXISTS advertisements (
        id SERIAL PRIMARY KEY,
        title_ar VARCHAR(255) NOT NULL,
        title_en VARCHAR(255) NOT NULL,
        description_ar TEXT,
        description_en TEXT,
        image_url TEXT NOT NULL,
        video_url TEXT,
        poster_url TEXT,
        target_url TEXT NOT NULL,
        sponsor_name VARCHAR(100),
        badge_text_ar VARCHAR(50) DEFAULT 'مُموَّل',
        badge_text_en VARCHAR(50) DEFAULT 'Sponsored',
        position VARCHAR(50) DEFAULT 'sidebar',
        format VARCHAR(50) DEFAULT 'sidebar',
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        meta_title_ar VARCHAR(255),
        meta_title_en VARCHAR(255),
        meta_description_ar TEXT,
        meta_description_en TEXT,
        keywords_ar TEXT,
        keywords_en TEXT,
        click_count INTEGER DEFAULT 0,
        impression_count INTEGER DEFAULT 0,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'bulletin_ads',
    query: `CREATE TABLE IF NOT EXISTS bulletin_ads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        author_name VARCHAR(255),
        author_avatar TEXT,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
        whatsapp_number VARCHAR(50),
        target_url TEXT,
        hashtags TEXT DEFAULT '',
        category VARCHAR(100) DEFAULT 'عام / General',
        price_paid NUMERIC(10,2) DEFAULT 0,
        duration_days INTEGER DEFAULT 7,
        status VARCHAR(50) DEFAULT 'pending',
        rejection_reason TEXT,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        shares_count INTEGER DEFAULT 0,
        clicks_count INTEGER DEFAULT 0,
        impressions_count INTEGER DEFAULT 0,
        starts_at TIMESTAMP,
        expires_at TIMESTAMP,
        page_id INTEGER,
        location_city VARCHAR(100) DEFAULT 'فلسطين',
        phone_number VARCHAR(50),
        video_url TEXT,
        is_boosted BOOLEAN DEFAULT FALSE,
        boosted_until TIMESTAMP,
        boost_tier VARCHAR(50),
        boost_price NUMERIC(10,2) DEFAULT 0,
        audience VARCHAR(50) DEFAULT 'public',
        ad_format VARCHAR(50) DEFAULT 'post',
        quick_questions JSONB DEFAULT '[]',
        feeling VARCHAR(100),
        tagged_users JSONB DEFAULT '[]',
        is_ai_generated BOOLEAN DEFAULT FALSE,
        has_whatsapp_button BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'bulletin_saved_ads',
    query: `CREATE TABLE IF NOT EXISTS bulletin_saved_ads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        ad_id INTEGER NOT NULL REFERENCES bulletin_ads(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, ad_id)
      )`
  },
  {
    name: 'bulletin_reports',
    query: `CREATE TABLE IF NOT EXISTS bulletin_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ad_id INTEGER NOT NULL REFERENCES bulletin_ads(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        details TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'bulletin_pages',
    query: `CREATE TABLE IF NOT EXISTS bulletin_pages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        category VARCHAR(100) DEFAULT 'تجارة إلكترونية / E-Commerce',
        city VARCHAR(100) DEFAULT 'غزة',
        address TEXT,
        description TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        cover_url TEXT NOT NULL,
        whatsapp_number VARCHAR(50),
        phone_number VARCHAR(50),
        website_url TEXT,
        is_verified BOOLEAN DEFAULT TRUE,
        followers_count INTEGER DEFAULT 0,
        ads_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'bulletin_page_followers',
    query: `CREATE TABLE IF NOT EXISTS bulletin_page_followers (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(page_id, user_id)
      )`
  },
  {
    name: 'bulletin_page_inquiries',
    query: `CREATE TABLE IF NOT EXISTS bulletin_page_inquiries (
        id SERIAL PRIMARY KEY,
        page_id INTEGER,
        ad_id INTEGER,
        sender_id INTEGER NOT NULL,
        sender_name VARCHAR(255),
        sender_phone VARCHAR(50),
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'bulletin_ad_likes',
    query: `CREATE TABLE IF NOT EXISTS bulletin_ad_likes (
        id SERIAL PRIMARY KEY,
        ad_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ad_id, user_id)
      )`
  },
  {
    name: 'bulletin_ad_comments',
    query: `CREATE TABLE IF NOT EXISTS bulletin_ad_comments (
        id SERIAL PRIMARY KEY,
        ad_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        author_name VARCHAR(255),
        author_avatar TEXT,
        content TEXT NOT NULL,
        parent_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'bulletin_ad_messages',
    query: `CREATE TABLE IF NOT EXISTS bulletin_ad_messages (
        id SERIAL PRIMARY KEY,
        ad_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        sender_name VARCHAR(255),
        sender_avatar TEXT,
        message TEXT NOT NULL,
        media_url TEXT,
        is_encrypted BOOLEAN DEFAULT TRUE,
        encryption_hash VARCHAR(255),
        status VARCHAR(50) DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'route_seo_settings',
    query: `CREATE TABLE IF NOT EXISTS route_seo_settings (
        id SERIAL PRIMARY KEY,
        route VARCHAR(255) UNIQUE NOT NULL,
        title_ar TEXT,
        title_en TEXT,
        description_ar TEXT,
        description_en TEXT,
        keywords_ar TEXT,
        keywords_en TEXT,
        og_image_url TEXT,
        alt_text_ar TEXT,
        alt_text_en TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'asset_metadata',
    query: `CREATE TABLE IF NOT EXISTS asset_metadata (
        id SERIAL PRIMARY KEY,
        file_url TEXT UNIQUE NOT NULL,
        asset_name VARCHAR(255),
        mime_type VARCHAR(100),
        file_size BIGINT,
        alt_text_ar TEXT,
        alt_text_en TEXT,
        og_title_ar TEXT,
        og_title_en TEXT,
        og_description_ar TEXT,
        og_description_en TEXT,
        keywords_ar TEXT,
        keywords_en TEXT,
        visual_summary TEXT,
        ai_analysis_raw JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'user_recommendation_interactions',
    query: `CREATE TABLE IF NOT EXISTS user_recommendation_interactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        item_type VARCHAR(50) NOT NULL,
        item_id INTEGER,
        item_key VARCHAR(255),
        action_type VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        weight NUMERIC(5,2) DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'user_recommendation_preferences',
    query: `CREATE TABLE IF NOT EXISTS user_recommendation_preferences (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        preferred_categories JSONB DEFAULT '[]',
        preferred_price_range JSONB DEFAULT '{"min": 0, "max": 10000}',
        excluded_item_types JSONB DEFAULT '[]',
        explicit_interests JSONB DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'recommendation_feedback',
    query: `CREATE TABLE IF NOT EXISTS recommendation_feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        item_type VARCHAR(50) NOT NULL,
        item_id INTEGER,
        item_key VARCHAR(255),
        feedback_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'user_sessions',
    query: `CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_token TEXT UNIQUE NOT NULL,
        ip_address VARCHAR(100),
        user_agent TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'model_cost_audit_logs',
    query: `CREATE TABLE IF NOT EXISTS model_cost_audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        tool_id VARCHAR(50),
        provider VARCHAR(50),
        model VARCHAR(100),
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        cost_usd DECIMAL(10, 6) DEFAULT 0,
        cost_credits INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'success',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'admin_approval_queue',
    query: `CREATE TABLE IF NOT EXISTS admin_approval_queue (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        verification_code VARCHAR(10),
        approver_id INTEGER,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'ad_pricing_audit',
    query: `CREATE TABLE IF NOT EXISTS ad_pricing_audit (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        field_name VARCHAR(100) NOT NULL,
        old_value NUMERIC(10,4),
        new_value NUMERIC(10,4),
        change_type VARCHAR(50) DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'ad_stats',
    query: `CREATE TABLE IF NOT EXISTS ad_stats (
        id SERIAL PRIMARY KEY,
        ad_id INTEGER NOT NULL,
        type VARCHAR(20) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'route_seo_metadata',
    query: `CREATE TABLE IF NOT EXISTS route_seo_metadata (
        route_path VARCHAR(255) PRIMARY KEY,
        title_ar TEXT,
        title_en TEXT,
        description_ar TEXT,
        description_en TEXT,
        og_image_url TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'db_connections_registry',
    query: `CREATE TABLE IF NOT EXISTS db_connections_registry (
        id VARCHAR(50) PRIMARY KEY,
        provider VARCHAR(50) NOT NULL DEFAULT 'postgresql',
        type VARCHAR(50) NOT NULL DEFAULT 'core',
        host VARCHAR(255) NOT NULL,
        port INTEGER NOT NULL DEFAULT 5432,
        db_name VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        password TEXT NOT NULL,
        connection_string TEXT,
        ssl_mode VARCHAR(50) DEFAULT 'require',
        pool_size INTEGER DEFAULT 10,
        is_active BOOLEAN DEFAULT true,
        status VARCHAR(50) DEFAULT 'healthy',
        last_checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  }
];

export async function applyCoreColumnEnforcements(targetPool: QueryClient) {
  // === 1. Core DB Column Enforcement (Before Indexes/FKs) ===
  await ensureColumnsBulk(targetPool, 'users', {
    email_notifications: { type: 'BOOLEAN', default: 'true' },
    avatar: { type: 'TEXT' },
    referral_code: { type: 'VARCHAR(6)' },
    provider: { type: 'VARCHAR(50)', default: 'local' },
    kyc_status: { type: 'VARCHAR(50)', default: 'none' },
    kyc_required: { type: 'BOOLEAN', default: false },
    kyc_rejection_reason: { type: 'TEXT' },
    kyc_submitted_at: { type: 'TIMESTAMP' },
    avatar_asset_id: { type: 'UUID' }
  });

  await ensureColumnsBulk(targetPool, 'chats', {
    tool: { type: 'VARCHAR(50)', default: 'chat' },
    tool_id: { type: 'VARCHAR(50)', default: 'chat' },
    context_summary: { type: 'TEXT' },
    is_pinned: { type: 'BOOLEAN', default: false }
  });

  await ensureColumnsBulk(targetPool, 'messages', {
    tool: { type: 'VARCHAR(50)', default: 'chat' },
    tool_id: { type: 'VARCHAR(50)', default: 'chat' },
    model: { type: 'VARCHAR(100)' },
    feedback: { type: 'VARCHAR(20)' },
    thinking_steps: { type: 'JSONB' },
    citations: { type: 'JSONB' },
    follow_ups: { type: 'JSONB' },
    generation_time: { type: 'INTEGER', default: 0 },
    is_pinned: { type: 'BOOLEAN', default: false },
    tokens_used: { type: 'INTEGER', default: 0 }
  });

  await ensureColumnsBulk(targetPool, 'api_keys_vault', {
    url_key: { type: 'VARCHAR(255)' },
    protocol_config: { type: 'JSONB', default: "'{}'" },
    models: { type: 'JSONB', default: "'[]'" },
    model_list: { type: 'JSONB', default: "'[]'" },
    is_active: { type: 'BOOLEAN', default: true }
  });

  await ensureColumnsBulk(targetPool, 'tool_orchestrator', {
    task_description: { type: 'TEXT' },
    task_description_ar: { type: 'TEXT' },
    cost_per_usage: { type: 'INTEGER', default: 0 },
    fallback_1_provider: { type: 'VARCHAR(50)' },
    fallback_1_model: { type: 'VARCHAR(100)' },
    fallback_2_provider: { type: 'VARCHAR(50)' },
    fallback_2_model: { type: 'VARCHAR(100)' },
    fallback_3_provider: { type: 'VARCHAR(50)' },
    fallback_3_model: { type: 'VARCHAR(100)' },
    timeout_seconds: { type: 'INTEGER', default: 60 },
    custom_headers: { type: 'JSONB', default: "'{}'" },
    pricing_rule: { type: 'JSONB', default: "'{}'" }
  });

  await ensureColumnsBulk(targetPool, 'subscriptions', {
    plan_type: { type: 'VARCHAR(50)', default: "'user'" },
    price: { type: 'DECIMAL(10,2)', default: 0 },
    limits: { type: 'JSONB', default: "'{}'" }
  });

  await ensureColumnsBulk(targetPool, 'user_files', {
    extracted_text: { type: 'TEXT' },
    is_active: { type: 'BOOLEAN', default: true },
    token_count: { type: 'INTEGER', default: 0 },
    category: { type: 'VARCHAR(50)', default: "'document'" },
    tags: { type: 'TEXT[]', default: "'{}'" },
    uploaded_by_role: { type: 'VARCHAR(50)', default: "'user'" }
  });

  await ensureColumnsBulk(targetPool, 'system_settings', {
    site_name_en: { type: 'VARCHAR(255)', default: 'Perplexta' },
    site_name_ar: { type: 'VARCHAR(255)', default: 'بيربليكستا' },
    description_en: { type: 'TEXT' },
    description_ar: { type: 'TEXT' },
    logo_url: { type: 'TEXT' },
    theme: { type: 'VARCHAR(20)', default: "'dark'" },
    default_language: { type: 'VARCHAR(10)', default: "'en'" },
    maintenance_mode: { type: 'BOOLEAN', default: false },
    allow_registrations: { type: 'BOOLEAN', default: true },
    security_config: { type: 'JSONB', default: "'{}'" },
    support_email: { type: 'VARCHAR(255)' },
    social_links: { type: 'JSONB', default: "'{}'" },
    custom_css: { type: 'TEXT' },
    custom_js: { type: 'TEXT' },
    seo_keywords: { type: 'TEXT' },
    seo_description: { type: 'TEXT' },
    analytics_code: { type: 'TEXT' },
    terms_content: { type: 'TEXT' },
    privacy_content: { type: 'TEXT' },
    smtp_config: { type: 'JSONB', default: "'{}'" },
    enable_crypto_payments: { type: 'BOOLEAN', default: false },
    enable_stripe_payments: { type: 'BOOLEAN', default: true },
    min_deposit_amount: { type: 'DECIMAL(10,2)', default: 10 },
    max_deposit_amount: { type: 'DECIMAL(10,2)', default: 10000 },
    referral_reward_amount: { type: 'DECIMAL(10,2)', default: 5 }
  });

  await ensureColumnsBulk(targetPool, 'bulletin_ads', {
    view_count: { type: 'INTEGER', default: 0 },
    click_count: { type: 'INTEGER', default: 0 },
    is_featured: { type: 'BOOLEAN', default: false },
    is_pinned: { type: 'BOOLEAN', default: false },
    priority: { type: 'INTEGER', default: 0 },
    page_id: { type: 'INTEGER' },
    target_url: { type: 'TEXT' },
    badge_text: { type: 'VARCHAR(100)' },
    cta_label: { type: 'VARCHAR(100)' },
    cta_action: { type: 'VARCHAR(50)' },
    cta_payload: { type: 'TEXT' },
    cta_style: { type: 'VARCHAR(50)' },
    badge_color: { type: 'VARCHAR(50)' },
    tags: { type: 'TEXT[]', default: "'{}'" },
    metadata: { type: 'JSONB', default: "'{}'" }
  });

  await ensureColumnsBulk(targetPool, 'bulletin_pages', {
    view_count: { type: 'INTEGER', default: 0 },
    followers_count: { type: 'INTEGER', default: 0 },
    rating: { type: 'DECIMAL(3,2)', default: 5.0 },
    review_count: { type: 'INTEGER', default: 0 },
    is_verified: { type: 'BOOLEAN', default: false },
    is_featured: { type: 'BOOLEAN', default: false },
    social_links: { type: 'JSONB', default: "'{}'" },
    custom_sections: { type: 'JSONB', default: "'[]'" }
  });

  await ensureColumnsBulk(targetPool, 'bulletin_ad_comments', {
    parent_id: { type: 'INTEGER' },
    like_count: { type: 'INTEGER', default: 0 },
    is_pinned: { type: 'BOOLEAN', default: false }
  });

  await ensureColumnsBulk(targetPool, 'bulletin_ad_likes', {
    user_id: { type: 'INTEGER' },
    ad_id: { type: 'INTEGER' }
  });

  await ensureColumnsBulk(targetPool, 'bulletin_page_followers', {
    user_id: { type: 'INTEGER' },
    page_id: { type: 'INTEGER' }
  });

  await ensureColumnsBulk(targetPool, 'bulletin_page_inquiries', {
    user_id: { type: 'INTEGER' },
    page_id: { type: 'INTEGER' }
  });

  await ensureColumnsBulk(targetPool, 'bulletin_saved_ads', {
    user_id: { type: 'INTEGER' },
    ad_id: { type: 'INTEGER' }
  });

  await ensureColumnsBulk(targetPool, 'route_seo_settings', {
    route_path: { type: 'VARCHAR(255)' },
    title_en: { type: 'VARCHAR(255)' },
    title_ar: { type: 'VARCHAR(255)' },
    description_en: { type: 'TEXT' },
    description_ar: { type: 'TEXT' },
    keywords_en: { type: 'TEXT' },
    keywords_ar: { type: 'TEXT' },
    og_image: { type: 'TEXT' },
    canonical_url: { type: 'TEXT' },
    structured_data: { type: 'JSONB', default: "'{}'" },
    is_active: { type: 'BOOLEAN', default: true }
  });

  await ensureColumnsBulk(targetPool, 'asset_metadata', {
    asset_id: { type: 'VARCHAR(255)' },
    file_type: { type: 'VARCHAR(50)' },
    mime_type: { type: 'VARCHAR(100)' },
    byte_size: { type: 'BIGINT', default: 0 },
    dimensions: { type: 'JSONB', default: "'{}'" },
    storage_provider: { type: 'VARCHAR(50)', default: "'local'" },
    storage_path: { type: 'TEXT' },
    public_url: { type: 'TEXT' },
    checksum_sha256: { type: 'VARCHAR(64)' },
    tags: { type: 'TEXT[]', default: "'{}'" },
    metadata: { type: 'JSONB', default: "'{}'" }
  });

  await ensureColumnsBulk(targetPool, 'user_activity_logs', {
    user_id: { type: 'INTEGER' },
    activity_type: { type: 'VARCHAR(50)' },
    description: { type: 'TEXT' },
    ip_address: { type: 'VARCHAR(45)' },
    user_agent: { type: 'TEXT' },
    metadata: { type: 'JSONB', default: "'{}'" }
  });

  await ensureColumnsBulk(targetPool, 'marketplace_items', {
    seller_id: { type: 'INTEGER' },
    title: { type: 'VARCHAR(255)' },
    description: { type: 'TEXT' },
    category: { type: 'VARCHAR(50)' },
    price_credits: { type: 'INTEGER', default: 0 },
    price_usd: { type: 'DECIMAL(10,2)', default: 0 },
    preview_url: { type: 'TEXT' },
    asset_id: { type: 'VARCHAR(255)' },
    image_asset_id: { type: 'UUID' },
    rating: { type: 'DECIMAL(3,2)', default: 5.0 },
    sales_count: { type: 'INTEGER', default: 0 },
    is_published: { type: 'BOOLEAN', default: true },
    metadata: { type: 'JSONB', default: "'{}'" }
  });

  await ensureColumnsBulk(targetPool, 'marketplace_purchases', {
    user_id: { type: 'INTEGER' },
    item_id: { type: 'INTEGER' },
    price_paid: { type: 'DECIMAL(10,2)', default: 0 },
    currency: { type: 'VARCHAR(10)', default: "'CREDITS'" },
    transaction_id: { type: 'INTEGER' },
    status: { type: 'VARCHAR(50)', default: "'completed'" }
  });

  await ensureColumnsBulk(targetPool, 'marketplace_reviews', {
    user_id: { type: 'INTEGER' },
    item_id: { type: 'INTEGER' },
    rating: { type: 'INTEGER', default: 5 },
    review_text: { type: 'TEXT' }
  });

  await ensureColumnsBulk(targetPool, 'media_assets', {
    id: { type: 'UUID' },
    stored_path: { type: 'TEXT' },
    original_filename: { type: 'TEXT' },
    context: { type: 'TEXT', default: 'general' },
    format: { type: 'TEXT', default: 'webp' },
    width: { type: 'INT', default: 0 },
    height: { type: 'INT', default: 0 },
    size_bytes: { type: 'INT', default: 0 },
    sha256_hash: { type: 'TEXT' },
    is_public: { type: 'BOOLEAN', default: false },
    user_id: { type: 'INTEGER' },
    blog_article_id: { type: 'INTEGER' },
    marketplace_item_id: { type: 'INTEGER' },
    metadata: { type: 'JSONB', default: "'{}'" }
  });

  await ensureColumnsBulk(targetPool, 'advertisements', {
    format: { type: 'VARCHAR(20)', default: "'landscape'" },
    target_pages: { type: 'TEXT[]', default: "'{}'" },
    image_asset_id: { type: 'UUID' }
  });

  await ensureColumnsBulk(targetPool, 'system_broadcasts', {
    target_roles: { type: 'TEXT[]', default: "'{}'" },
    priority: { type: 'VARCHAR(20)', default: "'medium'" },
    action_url: { type: 'TEXT' },
    action_label: { type: 'VARCHAR(100)' }
  });

  await ensureColumnsBulk(targetPool, 'notifications', {
    is_read: { type: 'BOOLEAN', default: false },
    type: { type: 'VARCHAR(50)', default: 'system' },
    metadata: { type: 'JSONB', default: "'{}'" },
    action_url: { type: 'TEXT' }
  });

  await ensureColumnsBulk(targetPool, 'plans', {
    plan_type: { type: 'VARCHAR(50)', default: 'user' },
    limits: { type: 'JSONB', default: "'{}'" },
    features: { type: 'JSONB', default: "'[]'" },
    color: { type: 'VARCHAR(20)', default: '#3b82f6' },
    badge: { type: 'VARCHAR(50)' },
    is_popular: { type: 'BOOLEAN', default: false }
  });

  await ensureColumnsBulk(targetPool, 'video_resources', {
    storage_provider: { type: 'VARCHAR(50)', default: "'local'" },
    video_codec: { type: 'VARCHAR(50)' },
    audio_codec: { type: 'VARCHAR(50)' },
    bitrate_kbps: { type: 'INTEGER', default: 0 },
    fps: { type: 'DECIMAL(5,2)', default: 0 },
    aspect_ratio: { type: 'VARCHAR(20)' },
    has_subtitles: { type: 'BOOLEAN', default: false },
    is_processed: { type: 'BOOLEAN', default: false },
    transcode_status: { type: 'VARCHAR(50)', default: "'pending'" },
    error_log: { type: 'TEXT' }
  });

  await ensureColumnsBulk(targetPool, 'model_cost_audit_logs', {
    id: { type: 'SERIAL' },
    user_id: { type: 'INTEGER' },
    tool_id: { type: 'VARCHAR(50)' },
    provider: { type: 'VARCHAR(50)' },
    model: { type: 'VARCHAR(100)' },
    prompt_tokens: { type: 'INTEGER', default: 0 },
    completion_tokens: { type: 'INTEGER', default: 0 },
    total_tokens: { type: 'INTEGER', default: 0 },
    cost_usd: { type: 'DECIMAL(10, 6)', default: 0 },
    cost_credits: { type: 'INTEGER', default: 0 },
    status: { type: 'VARCHAR(50)', default: "'success'" },
    error_message: { type: 'TEXT' },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });

  await ensureColumnsBulk(targetPool, 'user_sessions', {
    id: { type: 'SERIAL' },
    user_id: { type: 'INTEGER' },
    session_token: { type: 'TEXT' },
    ip_address: { type: 'VARCHAR(100)' },
    user_agent: { type: 'TEXT' },
    status: { type: 'VARCHAR(20)', default: "'active'" },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
    expires_at: { type: 'TIMESTAMP' },
    last_active_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });

  await ensureColumnsBulk(targetPool, 'admin_approval_queue', {
    id: { type: 'SERIAL' },
    requester_id: { type: 'INTEGER' },
    action_type: { type: 'VARCHAR(100)' },
    payload: { type: 'JSONB', default: "'{}'" },
    status: { type: 'VARCHAR(20)', default: "'pending'" },
    verification_code: { type: 'VARCHAR(10)' },
    approver_id: { type: 'INTEGER' },
    rejection_reason: { type: 'TEXT' },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });

  await ensureColumnsBulk(targetPool, 'ad_pricing_audit', {
    id: { type: 'SERIAL' },
    admin_id: { type: 'INTEGER' },
    field_name: { type: 'VARCHAR(100)' },
    old_value: { type: 'NUMERIC(10,4)' },
    new_value: { type: 'NUMERIC(10,4)' },
    change_type: { type: 'VARCHAR(50)', default: "'manual'" },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });

  await ensureColumnsBulk(targetPool, 'ad_stats', {
    id: { type: 'SERIAL' },
    ad_id: { type: 'INTEGER' },
    type: { type: 'VARCHAR(20)' },
    ip_address: { type: 'VARCHAR(45)' },
    user_agent: { type: 'TEXT' },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });

  await ensureColumnsBulk(targetPool, 'route_seo_metadata', {
    route_path: { type: 'VARCHAR(255)' },
    title_ar: { type: 'TEXT' },
    title_en: { type: 'TEXT' },
    description_ar: { type: 'TEXT' },
    description_en: { type: 'TEXT' },
    og_image_url: { type: 'TEXT' },
    updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });

  await ensureColumnsBulk(targetPool, 'support_tickets', {
    status: { type: 'VARCHAR(50)', default: 'open' },
    priority: { type: 'VARCHAR(50)', default: 'medium' },
    category: { type: 'VARCHAR(50)', default: 'general' }
  });

  await ensureColumnsBulk(targetPool, 'support_ticket_replies', {
    is_internal: { type: 'BOOLEAN', default: false }
  });

  await ensureColumnsBulk(targetPool, 'db_connections_registry', {
    id: { type: 'VARCHAR(50)' },
    provider: { type: 'VARCHAR(50)', default: "'postgresql'" },
    type: { type: 'VARCHAR(50)', default: "'core'" },
    host: { type: 'VARCHAR(255)' },
    port: { type: 'INTEGER', default: 5432 },
    db_name: { type: 'VARCHAR(255)' },
    username: { type: 'VARCHAR(255)' },
    password: { type: 'TEXT' },
    connection_string: { type: 'TEXT' },
    ssl_mode: { type: 'VARCHAR(50)', default: "'require'" },
    pool_size: { type: 'INTEGER', default: 10 },
    is_active: { type: 'BOOLEAN', default: true },
    status: { type: 'VARCHAR(50)', default: "'healthy'" },
    last_checked_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });
}

export const CORE_INDEXES: string[] = [
  `CREATE UNIQUE INDEX IF NOT EXISTS referral_invitations_pkey ON referral_invitations(id)`,
  `CREATE INDEX IF NOT EXISTS idx_referral_invitations_referrer ON referral_invitations(referrer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_referral_invitations_email ON referral_invitations(email)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS api_keys_vault_pkey ON api_keys_vault(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS api_keys_vault_provider_key ON api_keys_vault(provider)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS chat_memories_pkey ON chat_memories(id)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_memories_user_id ON chat_memories(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_memories_chat_id ON chat_memories(chat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chat_memories_user_id_created_at ON chat_memories(user_id, created_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS chats_pkey ON chats(id)`,
  `CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chats_user_id_updated_at ON chats(user_id, updated_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS db_connections_registry_pkey ON db_connections_registry(id)`,
  `CREATE INDEX IF NOT EXISTS idx_db_connections_id ON db_connections_registry(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS email_settings_pkey ON email_settings(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS email_templates_name_key ON email_templates(name)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS email_templates_pkey ON email_templates(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS message_reports_pkey ON message_reports(id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS messages_pkey ON messages(id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS notifications_pkey ON notifications(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS password_resets_pkey ON password_resets(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS plans_name_en_key ON plans(name_en)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS plans_pkey ON plans(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_pkey ON subscriptions(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_key ON subscriptions(user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS support_ticket_replies_pkey ON support_ticket_replies(id)`,
  `CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON support_ticket_replies(ticket_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_pkey ON support_tickets(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS system_broadcasts_pkey ON system_broadcasts(id)`,
  `CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS system_logs_pkey ON system_logs(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS system_settings_pkey ON system_settings(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS oauth_states_pkey ON oauth_states(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS oauth_states_state_key ON oauth_states(state)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS tool_orchestrator_pkey ON tool_orchestrator(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS tool_orchestrator_tool_id_key ON tool_orchestrator(tool_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS user_files_pkey ON user_files(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS user_shortcuts_pkey ON user_shortcuts(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS user_usage_pkey ON user_usage(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users(email)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_pkey ON users(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS video_resources_pkey ON video_resources(id)`,
  `CREATE INDEX IF NOT EXISTS idx_video_resources_chat_id ON video_resources(chat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_video_resources_user_id ON video_resources(user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS media_assets_pkey ON media_assets(id)`,
  `CREATE INDEX IF NOT EXISTS idx_media_assets_context ON media_assets(context)`,
  `CREATE INDEX IF NOT EXISTS idx_media_assets_hash ON media_assets(sha256_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_media_assets_stored_path ON media_assets(stored_path)`,
  `CREATE INDEX IF NOT EXISTS idx_media_assets_user_id ON media_assets(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_media_assets_marketplace_item_id ON media_assets(marketplace_item_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_avatar_asset_id ON users(avatar_asset_id)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_items_image_asset_id ON marketplace_items(image_asset_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_ads_user_id ON bulletin_ads(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_ads_page_id ON bulletin_ads(page_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_ads_status ON bulletin_ads(status)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_ads_ad_format ON bulletin_ads(ad_format)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_ads_created_at ON bulletin_ads(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_pages_user_id ON bulletin_pages(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_pages_category ON bulletin_pages(category)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_ad_comments_ad_id ON bulletin_ad_comments(ad_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_ad_likes_ad_user ON bulletin_ad_likes(ad_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_page_followers_page_user ON bulletin_page_followers(page_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_page_inquiries_page ON bulletin_page_inquiries(page_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_page_inquiries_sender ON bulletin_page_inquiries(sender_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bulletin_saved_ads_user_ad ON bulletin_saved_ads(user_id, ad_id)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_user ON marketplace_purchases(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_item ON marketplace_reviews(item_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)`,
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_model_cost_audit_user ON model_cost_audit_logs(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_model_cost_audit_tool ON model_cost_audit_logs(tool_id)`,
  `CREATE INDEX IF NOT EXISTS idx_model_cost_audit_created ON model_cost_audit_logs(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_admin_approval_queue_status ON admin_approval_queue(status)`,
  `CREATE INDEX IF NOT EXISTS idx_admin_approval_queue_requester ON admin_approval_queue(requester_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ad_pricing_audit_admin_id ON ad_pricing_audit(admin_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ad_pricing_audit_created_at ON ad_pricing_audit(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_ad_stats_ad_id ON ad_stats(ad_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ad_stats_type ON ad_stats(type)`,
  `CREATE INDEX IF NOT EXISTS idx_ad_stats_created_at ON ad_stats(created_at)`
];

export const CORE_RELATIONS: ForeignKeyRelation[] = [
  { table: 'chats', constraint: 'chats_user_id_fkey', column: 'user_id', ref: 'users' },
  { table: 'messages', constraint: 'messages_chat_id_fkey', column: 'chat_id', ref: 'chats' },
  { table: 'notifications', constraint: 'notifications_user_id_fkey', column: 'user_id', ref: 'users' },
  { table: 'subscriptions', constraint: 'subscriptions_plan_id_fkey', column: 'plan_id', ref: 'plans', onDelete: 'SET NULL' },
  { table: 'subscriptions', constraint: 'subscriptions_user_id_fkey', column: 'user_id', ref: 'users' },
  { table: 'system_broadcasts', constraint: 'system_broadcasts_admin_id_fkey', column: 'admin_id', ref: 'users', onDelete: 'SET NULL' },
  { table: 'user_files', constraint: 'user_files_chat_id_fkey', column: 'chat_id', ref: 'chats', onDelete: 'SET NULL' },
  { table: 'user_files', constraint: 'user_files_user_id_fkey', column: 'user_id', ref: 'users' },
  { table: 'users', constraint: 'users_referred_by_fkey', column: 'referred_by', ref: 'users', onDelete: 'SET NULL' },
  { table: 'media_assets', constraint: 'fk_media_assets_user_id', column: 'user_id', ref: 'users', onDelete: 'SET NULL' },
  { table: 'media_assets', constraint: 'fk_media_assets_marketplace_item_id', column: 'marketplace_item_id', ref: 'marketplace_items', onDelete: 'SET NULL' },
  { table: 'users', constraint: 'fk_users_avatar_asset_id', column: 'avatar_asset_id', ref: 'media_assets', onDelete: 'SET NULL' },
  { table: 'marketplace_items', constraint: 'fk_marketplace_items_image_asset_id', column: 'image_asset_id', ref: 'media_assets', onDelete: 'SET NULL' },
  { table: 'user_sessions', constraint: 'fk_user_sessions_user', column: 'user_id', ref: 'users', onDelete: 'CASCADE' },
  { table: 'admin_approval_queue', constraint: 'fk_admin_approval_queue_requester', column: 'requester_id', ref: 'users', onDelete: 'CASCADE' },
  { table: 'ad_pricing_audit', constraint: 'fk_ad_pricing_audit_admin', column: 'admin_id', ref: 'users', onDelete: 'CASCADE' }
];

export async function applyCoreRelations(targetPool: QueryClient) {
  for (const rel of CORE_RELATIONS) {
    await ensureForeignKey(targetPool, rel.table, rel.constraint, rel.column, rel.ref, rel.refColumn || 'id', rel.onDelete || 'CASCADE');
  }
}

export async function seedCoreDatabase(targetPool: QueryClient, targetLedgerPool?: QueryClient) {
  // System Settings Seed
  const settingsCheck = await targetPool.query('SELECT count(*) FROM system_settings');
  if (parseInt(settingsCheck.rows[0].count, 10) === 0) {
    await targetPool.query(
      `INSERT INTO system_settings (site_name_en, site_name_ar) VALUES ($1, $2)`,
      ['Perplexta', 'بيربليكستا']
    );
  }

  // Admin User Seed
  const email = process.env.ADMIN_EMAIL || 'admin@perplexta.com';
  const adminCheck = await targetPool.query('SELECT * FROM users WHERE email = $1', [email]);

  if (adminCheck.rows.length === 0) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const newAdmin = await targetPool.query(
      `INSERT INTO users (email, name, password_hash, role, status) VALUES ($1, $2, $3, 'admin', 'active') RETURNING id`,
      [email, 'Master Admin', adminHash]
    );
    const adminId = newAdmin.rows[0].id;
    if (targetLedgerPool) {
      await targetLedgerPool.query(
        `INSERT INTO wallets (user_id, balance) VALUES ($1, 10000) ON CONFLICT (user_id) DO NOTHING`,
        [adminId]
      ).catch(() => {});
    }
  } else {
    const user = adminCheck.rows[0];
    await targetPool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [email]);
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword) {
      const isMatch = await bcrypt.compare(adminPassword, user.password_hash);
      const passwordAge = new Date().getTime() - new Date(user.updated_at).getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (!isMatch && passwordAge > thirtyDays) {
        console.log(`[Migrations] Updating admin password for: ${email} (password expired)`);
        const newHash = await bcrypt.hash(adminPassword, 10);
        await targetPool.query(
          'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [newHash, user.id]
        );
      }
    }
  }

  // Plans Seed
  const planCheck = await targetPool.query('SELECT count(*) FROM plans');
  if (parseInt(planCheck.rows[0].count, 10) === 0) {
    await targetPool.query(`
      INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, monthly_price, annual_price, discount, features, color, is_popular, badge, limits, plan_type)
      VALUES
        ('Starter', 'البداية', 'Free starter plan', 'خطة البداية المجانية', 0, 0, 0, '["Basic Search", "Limited AI Chats"]', '#334155', false, 'Standard', '{"chat": 20, "chat_fast": 30, "perplexta_analysis": 5, "image": 2, "code": 5, "notebook": 10, "stt": 5, "tts": 5, "storage_mb": 100}', 'user'),
        ('Pro', 'المحترف', 'Professional plan for advanced users', 'خطة المحترفين للمستخدمين المتقدمين', 19.99, 199.90, 17, '["Advanced Analysis", "Unlimited Chats", "Priority Support"]', '#3b82f6', true, 'Best Value', '{"chat": "unlimited", "chat_fast": "unlimited", "chat_pro": 100, "perplexta_analysis": 50, "image": 50, "code": 100, "notebook": 100, "stt": 100, "tts": 100, "storage_mb": 1024}', 'user'),
        ('Elite', 'النخبة', 'Full power for strategic expert users', 'القوة الكاملة للمستخدمين الخبراء الاستراتيجيين', 49.99, 499.90, 17, '["Full Perplexta Access", "Multi-model Orchestration", "Concierge Support"]', '#8b5cf6', false, 'Elite', '{"chat": "unlimited", "chat_fast": "unlimited", "chat_pro": "unlimited", "chat_reasoning": "unlimited", "perplexta_analysis": "unlimited", "image": "unlimited", "video": 50, "code": "unlimited", "legal_analysis": "unlimited", "storage_mb": 10240}', 'user')
      ON CONFLICT (name_en) DO NOTHING
    `);
  }

  const devPlanCheck = await targetPool.query("SELECT count(*) FROM plans WHERE plan_type = 'developer'");
  if (parseInt(devPlanCheck.rows[0].count, 10) === 0) {
    await targetPool.query(`
      INSERT INTO plans (name_en, name_ar, desc_en, desc_ar, monthly_price, annual_price, discount, features, color, is_popular, badge, limits, plan_type)
      VALUES
        ('Developer Lite', 'مطور لايت', 'Direct high-fidelity x402 gateway and programmatic client connectivity.', 'بوابة x402 عالية الدقة المباشرة وربط العملاء البرمجيين.', 29.99, 299.90, 17, '["Direct x402 API Access", "1,000 Key Requests/day", "Unified Failover Route", "Rate limit 30 req/min"]', '#8b5cf6', false, 'Dev Entry', '{"x402_api": 1000, "storage_mb": 2000}', 'developer'),
        ('Developer Scale', 'مطور سكيل', 'Unthrottled enterprise gateway and strategic multi-modal programmatic access.', 'بوابة المؤسسات غير المحدودة والوصول البرمجي المتعدد الاستراتيجي.', 99.99, 999.90, 17, '["Unthrottled x402 API Node", "10,000 Key Requests/day", "Dedicated Webhooks", "Automated Failover Orchestrator Mode", "Priority Support"]', '#ec4899', true, 'Best Dev Value', '{"x402_api": 10000, "storage_mb": 10240}', 'developer')
      ON CONFLICT (name_en) DO NOTHING
    `);
  }

  // Tool Orchestrator Seed
  await targetPool.query(`
    INSERT INTO tool_orchestrator (tool_id, primary_provider, primary_model, task_description, task_description_ar, cost_per_usage)
    VALUES
      ('chat', '', '', 'Elite strategic assistant for professional discourse and general logic.', 'مساعد استراتيجي نخبوي للنقاش المهني والمنطق العام.', 10),
      ('chat_fast', '', '', 'High-speed technical intelligence agent for quick insights.', 'عميل ذكاء تقني سريع للاستفسارات الفورية.', 5),
      ('chat_pro', '', '', 'Advanced perplexta reasoning engine for deep technical problem solving.', 'محرك استنتاج استراتيجي متقدم لحل المشكلات التقنية العميقة.', 25),
      ('chat_reasoning', '', '', 'Complex multi-step reasoning protocol for high-stakes intelligence.', 'بروتوكول تفكير معقد متعدد الخطوات للمهام فائقة الأهمية.', 50),
      ('perplexta_analysis', '', '', 'Professional technical synthesis and deep digital strategic search.', 'البحث الاستراتيجي الرقمي العميق والتحليل التقني المهني.', 15),
      ('image', '', '', 'High-precision visual synthesis engine for professional assets.', 'محرك توليد بصري عالي الدقة للأصول المهنية.', 30),
      ('video', '', '', 'Global standard video generation and cinematic synthesis.', 'توليد فيديو بمعايير عالمية وتوليد سينمائي متقدم.', 100),
      ('tts', '', '', 'Elite natural acoustic synthesis and voice engineering.', 'توليد صوتي طبيعي متطور وهندسة صوتية نخبوية.', 10),
      ('stt', '', '', 'High-fidelity acoustic transcription and linguistic extraction.', 'تحويل صوتي عالي الدقة واستخراج لغوي متقن.', 5),
      ('legal_analysis', '', '', 'Perplexta professional document auditing and legal synthesis.', 'تدقيق الوثائق المهنية الاحترافية والتركيب القانوني.', 40),
      ('learning', '', '', 'Advanced education assistant and tailored training system.', 'انظمة مساعد التعليم والدورات المخصصة.', 20),
      ('code', '', '', 'Master-level software engineering workstation and logic constructor.', 'محطة عمل هندسة البرمجيات وبناء المنطق البرمجي المتقدم.', 20),
      ('canvas', '', '', 'Perplexta creative studio and multi-modal design canvas.', 'استوديو الإبداع المتقدم ولوحة التصميم متعددة الوسائط.', 25),
      ('notebook', '', '', 'Strategic research workstation and technical knowledge synthesis.', 'محطة عمل الأبحاث الاستراتيجية وتركيب المعرفة التقنية.', 30),
      ('sovereign_memory', '', '', 'Unified sovereign system intelligence and long-term memory synthesis.', 'ذاكرة النظام السيادية الموحدة وتركيب المعارف طويلة الأمد.', 5),
      ('sovereign_search', '', '', 'Global real-time web intelligence and strategic knowledge extraction.', 'البحث الذكي العالمي في الوقت الفعلي واستخراج المعرفة الاستراتيجية.', 10),
      ('perplexta_music', 'google', 'lyria-3-pro-preview', 'Advanced acoustic composition and structural music synthesis.', 'التأليف الصوتي المتقدم والتركيب الموسيقي الهيكلي.', 50),
      ('x402_api', 'google', 'gemini-1.5-pro', 'Dynamic high-fidelity artificial intelligence analytics gateway for programmatic developer clients connected via x402 payment protocol.', 'بوابة تحليلات الذكاء الاصطناعي عالية الدقة الديناميكية لعملاء الوكلاء البرمجيين المتصلين ببروتوكول دفع x402.', 15)
    ON CONFLICT (tool_id) DO NOTHING
  `);
}
