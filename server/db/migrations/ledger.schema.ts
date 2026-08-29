import type { QueryClient, ForeignKeyRelation } from './types.js';
import { ensureColumnsBulk, ensureForeignKey } from './helpers.js';

export const LEDGER_SCHEMA_TABLES: { name: string; query: string }[] = [
  {
    name: 'wallets',
    query: `CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0.00,
  usd_balance DECIMAL(10,2) DEFAULT 0.00,
  points INTEGER DEFAULT 0,
  total_deposited DECIMAL(10,2) DEFAULT 0.00,
  total_withdrawn DECIMAL(10,2) DEFAULT 0.00,
  total_earned_referral DECIMAL(10,2) DEFAULT 0.00,
  is_frozen BOOLEAN DEFAULT FALSE,
  currency VARCHAR(10) DEFAULT 'USD',
  referral_activated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`
  },
  {
    name: 'ledger_transactions',
    query: `CREATE TABLE IF NOT EXISTS ledger_transactions (
  id SERIAL PRIMARY KEY,
  wallet_id INTEGER NOT NULL,
  user_id INTEGER,
  amount DECIMAL(10,2) NOT NULL,
  points INTEGER DEFAULT 0,
  transaction_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  reference_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  description TEXT,
  balance_after DECIMAL(10,2) DEFAULT 0.00,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`
  },
  {
    name: 'referrals',
    query: `CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL,
  referred_id INTEGER NOT NULL,
  reward_amount DECIMAL(10,2) DEFAULT 0.00,
  commission_earned DECIMAL(10,2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`
  },
  {
    name: 'referral_tree',
    query: `CREATE TABLE IF NOT EXISTS referral_tree (
  id SERIAL PRIMARY KEY,
  ancestor_id INTEGER NOT NULL,
  descendant_id INTEGER NOT NULL,
  depth INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ancestor_id, descendant_id)
)`
  },
  {
    name: 'kyc_requests',
    query: `CREATE TABLE IF NOT EXISTS kyc_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  document_number VARCHAR(100) NOT NULL,
  document_front_url TEXT NOT NULL,
  document_back_url TEXT,
  selfie_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`
  },
  {
    name: 'withdrawal_requests',
    query: `CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payout_method VARCHAR(50) NOT NULL,
  payout_details JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  rejection_reason TEXT,
  processed_by INTEGER,
  processed_at TIMESTAMP,
  transaction_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`
  },
  {
    name: 'payout_accounts',
    query: `CREATE TABLE IF NOT EXISTS payout_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  payout_method VARCHAR(50) NOT NULL,
  account_identifier TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`
  },
  {
    name: 'economy_settings',
    query: `CREATE TABLE IF NOT EXISTS economy_settings (
  id SERIAL PRIMARY KEY,
  credit_price_usd DECIMAL(10,4) DEFAULT 0.0100,
  free_tier_monthly_credits INTEGER DEFAULT 100,
  pro_tier_monthly_credits INTEGER DEFAULT 1000,
  enterprise_tier_monthly_credits INTEGER DEFAULT 10000,
  referral_reward_percentage DECIMAL(5,2) DEFAULT 10.00,
  crypto_wallet_address VARCHAR(255) DEFAULT '',
  stripe_enabled BOOLEAN DEFAULT TRUE,
  crypto_enabled BOOLEAN DEFAULT FALSE,
  min_deposit_usd DECIMAL(10,2) DEFAULT 10.00,
  max_deposit_usd DECIMAL(10,2) DEFAULT 5000.00,
  commission_rate_tier1 DECIMAL(5,2) DEFAULT 15.00,
  commission_rate_tier2 DECIMAL(5,2) DEFAULT 7.00,
  commission_rate_tier3 DECIMAL(5,2) DEFAULT 3.00,
  min_payout_amount DECIMAL(10,2) DEFAULT 50.00,
  is_active BOOLEAN DEFAULT TRUE,
  welcome_bonus_points INTEGER DEFAULT 0,
  referral_bonus_points INTEGER DEFAULT 0,
  min_withdrawal_cents INTEGER DEFAULT 5000,
  points_per_dollar INTEGER DEFAULT 100,
  conversion_rate DECIMAL(10,4) DEFAULT 1.0000,
  referral_bonus_percent DECIMAL(5,2) DEFAULT 10.00,
  min_payout_usd DECIMAL(10,2) DEFAULT 50.00,
  referral_activation_min_deposit DECIMAL(10,2) DEFAULT 10.00,
  crypto_address VARCHAR(255),
  bank_name VARCHAR(255),
  bank_recipient VARCHAR(255),
  bank_iban VARCHAR(255),
  bank_swift VARCHAR(100),
  paypal_email VARCHAR(255),
  currency_symbol VARCHAR(10) DEFAULT '$',
  exchange_rate_usd DECIMAL(10,4) DEFAULT 1.0,
  min_withdrawal DECIMAL(10,2) DEFAULT 50,
  withdrawal_fee_percent DECIMAL(5,2) DEFAULT 2.5,
  referral_commission_percent DECIMAL(5,2) DEFAULT 10,
  signup_bonus_credits INTEGER DEFAULT 100,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`
  },
  {
    name: 'coupons',
    query: `CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`
  },
  {
    name: 'coupon_usages',
    query: `CREATE TABLE IF NOT EXISTS coupon_usages (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`
  },
  {
    name: 'deposit_requests',
    query: `CREATE TABLE IF NOT EXISTS deposit_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  method VARCHAR(50) NOT NULL,
  proof_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  rejection_reason TEXT,
  admin_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`
  },
  {
    name: 'stripe_events',
    query: `CREATE TABLE IF NOT EXISTS stripe_events (
  id SERIAL PRIMARY KEY,
  stripe_event_id VARCHAR(255) CONSTRAINT ledger_stripe_events_event_id_key UNIQUE,
  type VARCHAR(100),
  status VARCHAR(20) DEFAULT 'processed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`
  }
];

export async function applyLedgerColumnEnforcements(targetLedgerPool: QueryClient) {
  // === 3. Ledger DB Column Enforcement ===
  await ensureColumnsBulk(targetLedgerPool, 'wallets', {
    total_deposited: { type: 'DECIMAL(10,2)', default: 0 },
    total_withdrawn: { type: 'DECIMAL(10,2)', default: 0 },
    total_earned_referral: { type: 'DECIMAL(10,2)', default: 0 },
    is_frozen: { type: 'BOOLEAN', default: false },
    currency: { type: 'VARCHAR(10)', default: "'USD'" },
    updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });

  await ensureColumnsBulk(targetLedgerPool, 'ledger_transactions', {
    user_id: { type: 'INTEGER' },
    type: { type: 'VARCHAR(50)' },
    amount: { type: 'DECIMAL(10,2)', default: 0 },
    balance_after: { type: 'DECIMAL(10,2)', default: 0 },
    description: { type: 'TEXT' },
    reference_id: { type: 'VARCHAR(255)' },
    metadata: { type: 'JSONB', default: '\'{}\'' }
  });

  await ensureColumnsBulk(targetLedgerPool, 'kyc_requests', {
    document_type: { type: 'VARCHAR(50)' },
    document_number: { type: 'VARCHAR(100)' },
    document_front_url: { type: 'TEXT' },
    document_back_url: { type: 'TEXT' },
    selfie_url: { type: 'TEXT' },
    status: { type: 'VARCHAR(50)', default: "'pending'" },
    rejection_reason: { type: 'TEXT' },
    reviewed_by: { type: 'INTEGER' },
    reviewed_at: { type: 'TIMESTAMP' }
  });

  await ensureColumnsBulk(targetLedgerPool, 'withdrawal_requests', {
    payout_method: { type: 'VARCHAR(50)' },
    payout_details: { type: 'JSONB', default: '\'{}\'' },
    status: { type: 'VARCHAR(50)', default: "'pending'" },
    rejection_reason: { type: 'TEXT' },
    processed_by: { type: 'INTEGER' },
    processed_at: { type: 'TIMESTAMP' },
    transaction_hash: { type: 'VARCHAR(255)' }
  });

  await ensureColumnsBulk(targetLedgerPool, 'economy_settings', {
    currency_symbol: { type: 'VARCHAR(10)', default: "'$'" },
    exchange_rate_usd: { type: 'DECIMAL(10,4)', default: 1.0 },
    min_withdrawal: { type: 'DECIMAL(10,2)', default: 50 },
    withdrawal_fee_percent: { type: 'DECIMAL(5,2)', default: 2.5 },
    referral_commission_percent: { type: 'DECIMAL(5,2)', default: 10 },
    signup_bonus_credits: { type: 'INTEGER', default: 100 }
  });

  await ensureColumnsBulk(targetLedgerPool, 'coupons', {
    code: { type: 'VARCHAR(50)' },
    discount_percent: { type: 'DECIMAL(5,2)', default: 0 },
    discount_amount: { type: 'DECIMAL(10,2)', default: 0 },
    max_uses: { type: 'INTEGER', default: 0 },
    used_count: { type: 'INTEGER', default: 0 },
    expires_at: { type: 'TIMESTAMP' },
    is_active: { type: 'BOOLEAN', default: true }
  });

  await ensureColumnsBulk(targetLedgerPool, 'referrals', {
    referrer_id: { type: 'INTEGER' },
    referred_id: { type: 'INTEGER' },
    commission_earned: { type: 'DECIMAL(10,2)', default: 0 },
    status: { type: 'VARCHAR(50)', default: "'active'" }
  });

  await ensureColumnsBulk(targetLedgerPool, 'deposit_requests', {
    user_id: { type: 'INTEGER' },
    amount: { type: 'DECIMAL(10,2)', default: 0 },
    currency: { type: 'VARCHAR(10)', default: "'USD'" },
    method: { type: 'VARCHAR(50)' },
    proof_url: { type: 'TEXT' },
    status: { type: 'VARCHAR(20)', default: "'pending'" },
    rejection_reason: { type: 'TEXT' },
    admin_id: { type: 'INTEGER' },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });

  await ensureColumnsBulk(targetLedgerPool, 'stripe_events', {
    stripe_event_id: { type: 'VARCHAR(255)' },
    type: { type: 'VARCHAR(100)' },
    status: { type: 'VARCHAR(20)', default: "'processed'" },
    metadata: { type: 'JSONB', default: "'{}'" },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });
}

export const LEDGER_INDEXES: string[] = [
  `CREATE UNIQUE INDEX IF NOT EXISTS wallets_pkey ON wallets(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS wallets_user_id_key ON wallets(user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ledger_transactions_pkey ON ledger_transactions(id)`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON ledger_transactions(wallet_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_created ON ledger_transactions(created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS referrals_pkey ON referrals(id)`,
  `CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)`,
  `CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS referral_tree_pkey ON referral_tree(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS referral_tree_ancestor_id_descendant_id_key ON referral_tree(ancestor_id, descendant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ref_tree_ancestor ON referral_tree(ancestor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ref_tree_descendant ON referral_tree(descendant_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS deposit_requests_pkey ON deposit_requests(id)`,
  `CREATE INDEX IF NOT EXISTS idx_deposit_requests_user ON deposit_requests(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON deposit_requests(status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_pkey ON stripe_events(id)`,
  `CREATE INDEX IF NOT EXISTS idx_stripe_events_status ON stripe_events(status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS kyc_requests_pkey ON kyc_requests(id)`,
  `CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_requests(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_kyc_status ON kyc_requests(status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_requests_pkey ON withdrawal_requests(id)`,
  `CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawal_requests(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS payout_accounts_pkey ON payout_accounts(id)`,
  `CREATE INDEX IF NOT EXISTS idx_payout_accounts_user ON payout_accounts(user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS economy_settings_pkey ON economy_settings(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS coupons_pkey ON coupons(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_key ON coupons(code)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS coupon_usages_pkey ON coupon_usages(id)`,
  `CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages(coupon_id)`,
  `CREATE INDEX IF NOT EXISTS idx_coupon_usages_user ON coupon_usages(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_user ON ledger_transactions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_type ON ledger_transactions(transaction_type)`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_status ON ledger_transactions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_reference ON ledger_transactions(reference_id)`
];

export const LEDGER_RELATIONS: ForeignKeyRelation[] = [
  { table: 'ledger_transactions', constraint: 'ledger_transactions_wallet_id_fkey', column: 'wallet_id', ref: 'wallets' },
  { table: 'coupon_usages', constraint: 'coupon_usages_coupon_id_fkey', column: 'coupon_id', ref: 'coupons', onDelete: 'SET NULL' }
];

export async function applyLedgerRelations(targetLedgerPool: QueryClient) {
  for (const rel of LEDGER_RELATIONS) {
    await ensureForeignKey(targetLedgerPool, rel.table, rel.constraint, rel.column, rel.ref, rel.refColumn || 'id', rel.onDelete || 'CASCADE');
  }
}

export async function seedLedgerDatabase(targetLedgerPool: QueryClient) {
  const ecoCheck = await targetLedgerPool.query('SELECT count(*) FROM economy_settings');
  if (parseInt(ecoCheck.rows[0].count, 10) === 0) {
    await targetLedgerPool.query(`
      INSERT INTO economy_settings (
        credit_price_usd, free_tier_monthly_credits, pro_tier_monthly_credits,
        enterprise_tier_monthly_credits, referral_reward_percentage,
        crypto_wallet_address, stripe_enabled, crypto_enabled, min_deposit_usd, max_deposit_usd,
        commission_rate_tier1, commission_rate_tier2, commission_rate_tier3,
        min_payout_amount, is_active, updated_at
      ) VALUES (
        0.01, 100, 1000, 10000, 10.00,
        '', true, false, 10.00, 5000.00,
        15.00, 7.00, 3.00,
        50.00, true, CURRENT_TIMESTAMP
      )
    `);
  }
}
