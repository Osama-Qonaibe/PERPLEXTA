import type { QueryClient } from './types.js';
import { ensureColumnsBulk } from './helpers.js';

export const SECURITY_SCHEMA_TABLES: { name: string; query: string }[] = [
  {
    name: 'token_blacklist',
    query: `CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'security_alerts',
    query: `CREATE TABLE IF NOT EXISTS security_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        type VARCHAR(100) NOT NULL,
        severity VARCHAR(50) DEFAULT 'medium',
        description TEXT,
        metadata JSONB DEFAULT '{}',
        is_resolved BOOLEAN DEFAULT false,
        ip_address VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'admin_audit_logs',
    query: `CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        admin_email VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        target_resource VARCHAR(100),
        details JSONB DEFAULT '{}',
        ip_address VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  },
  {
    name: 'registered_agents',
    query: `CREATE TABLE IF NOT EXISTS registered_agents (
        id SERIAL PRIMARY KEY,
        client_id VARCHAR(255) UNIQUE NOT NULL,
        client_secret VARCHAR(255),
        api_key_hash VARCHAR(255),
        client_name VARCHAR(255) NOT NULL,
        identity_type VARCHAR(50) DEFAULT 'agent',
        credential_type VARCHAR(50) DEFAULT 'client_credentials',
        redirect_uris TEXT[],
        jwks_uri VARCHAR(500),
        user_agent VARCHAR(500),
        signature_keys JSONB,
        permissions JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
  }
];

export async function applySecurityColumnEnforcements(targetSecurityPool: QueryClient) {
  // === 4. Security DB Column Enforcement ===
  await ensureColumnsBulk(targetSecurityPool, 'token_blacklist', {
    token: { type: 'TEXT' },
    expires_at: { type: 'TIMESTAMP' },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });

  await ensureColumnsBulk(targetSecurityPool, 'security_alerts', {
    user_id: { type: 'INTEGER' },
    type: { type: 'VARCHAR(100)' },
    severity: { type: 'VARCHAR(50)', default: "'medium'" },
    description: { type: 'TEXT' },
    metadata: { type: 'JSONB', default: "'{}'" },
    is_resolved: { type: 'BOOLEAN', default: false },
    ip_address: { type: 'VARCHAR(100)' },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
    updated_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });

  await ensureColumnsBulk(targetSecurityPool, 'admin_audit_logs', {
    admin_id: { type: 'INTEGER' },
    admin_email: { type: 'VARCHAR(255)' },
    action: { type: 'VARCHAR(100)' },
    target_resource: { type: 'VARCHAR(100)' },
    details: { type: 'JSONB', default: "'{}'" },
    ip_address: { type: 'VARCHAR(100)' },
    user_agent: { type: 'TEXT' },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });

  await ensureColumnsBulk(targetSecurityPool, 'registered_agents', {
    client_id: { type: 'VARCHAR(255)' },
    client_secret: { type: 'VARCHAR(255)' },
    api_key_hash: { type: 'VARCHAR(255)' },
    client_name: { type: 'VARCHAR(255)' },
    identity_type: { type: 'VARCHAR(50)', default: "'agent'" },
    credential_type: { type: 'VARCHAR(50)', default: "'client_credentials'" },
    redirect_uris: { type: 'TEXT[]', default: "'{}'" },
    jwks_uri: { type: 'VARCHAR(500)' },
    user_agent: { type: 'VARCHAR(500)' },
    signature_keys: { type: 'JSONB' },
    permissions: { type: 'JSONB', default: "'[]'" },
    is_active: { type: 'BOOLEAN', default: true },
    user_id: { type: 'INTEGER' },
    created_at: { type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
  });
}

export const SECURITY_INDEXES: string[] = [
  `CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS security_alerts_pkey ON security_alerts(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_pkey ON token_blacklist(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS token_blacklist_token_key ON token_blacklist(token)`,
  `CREATE INDEX IF NOT EXISTS idx_token_blacklist_active_expires ON token_blacklist(expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS admin_audit_logs_pkey ON admin_audit_logs(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS registered_agents_pkey ON registered_agents(id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS registered_agents_client_id_key ON registered_agents(client_id)`
];
