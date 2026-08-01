/**
 * well-known.ts
 * All public agent/OAuth discovery routes (.well-known/*, /auth.md, /api/auth/jwks).
 * Every route here is public (no auth required) and shares the same CORS policy,
 * so we apply setPublicCorsHeaders once via router.use() instead of repeating
 * res.setHeader('Access-Control-Allow-Origin', '*') in every handler (A-3 fix).
 */
import { Router } from 'express';
import { getBaseUrl, getPreferredLanguage } from '../utils/request.js';
import { generateAuthMd } from '../utils/auth-md.js';
import { getOrCreateSigningKeys } from '../utils/keys.js';

const router = Router();

// ─── Shared CORS helper ───────────────────────────────────────────────────────
const setPublicCorsHeaders = (res: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

// ─── /auth.md ─────────────────────────────────────────────────────────────────
router.get('/auth.md', (req, res) => {
  setPublicCorsHeaders(res);
  const baseUrl = getBaseUrl(req);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Vary', 'Accept, Accept-Language');
  res.setHeader('X-Auth-Md-Version', '1.0');
  res.send(generateAuthMd(baseUrl, getPreferredLanguage(req)));
});

// ─── /.well-known/oauth-protected-resource ────────────────────────────────────
router.get('/.well-known/oauth-protected-resource', (req, res) => {
  setPublicCorsHeaders(res);
  const baseUrl = getBaseUrl(req);
  res.json({
    resource: baseUrl,
    authorization_servers: [baseUrl],
    scopes_supported: ['openid', 'profile', 'email', 'read', 'write'],
    resource_signing_alg_values_supported: ['RS256'],
    bearer_methods_supported: ['header', 'body', 'query'],
    resource_documentation: `${baseUrl}/auth.md`,
    agent_auth: {
      register_uri: `${baseUrl}/api/auth/agent-register`,
      claim_uri: `${baseUrl}/api/auth/claim`,
      revocation_uri: `${baseUrl}/api/auth/revoke`,
      identity_types_supported: ['anonymous', 'identity_assertion'],
      anonymous: { credential_types_supported: ['api_key'] },
      identity_assertion: {
        assertion_types_supported: ['urn:ietf:params:oauth:token-type:id-jag', 'verified_email'],
        credential_types_supported: ['access_token', 'api_key'],
      },
    },
  });
});

// ─── /.well-known/openid-configuration ───────────────────────────────────────
router.get('/.well-known/openid-configuration', (req, res) => {
  setPublicCorsHeaders(res);
  const baseUrl = getBaseUrl(req);
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/authorize`,
    token_endpoint: `${baseUrl}/api/auth/token`,
    jwks_uri: `${baseUrl}/api/auth/jwks`,
    userinfo_endpoint: `${baseUrl}/api/auth/user`,
    grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
    response_types_supported: ['code', 'token'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    id_token_signing_alg_values_supported: ['RS256'],
    subject_types_supported: ['public'],
    scopes_supported: ['openid', 'profile', 'email', 'read', 'write'],
    agent_auth: {
      register_uri: `${baseUrl}/api/auth/register-agent`,
      supported_identity_types: ['agent', 'user', 'app'],
      identity_types_supported: ['agent', 'user', 'app'],
      credential_types: ['api_key', 'bearer_token', 'client_credentials'],
      credential_types_supported: ['api_key', 'bearer_token', 'client_credentials'],
      claim_endpoint: `${baseUrl}/api/auth/claim`,
      claim_uri: `${baseUrl}/api/auth/claim`,
      claim_url: `${baseUrl}/api/auth/claim`,
      revocation_endpoint: `${baseUrl}/api/auth/revoke`,
      revocation_uri: `${baseUrl}/api/auth/revoke`,
      revocation_url: `${baseUrl}/api/auth/revoke`,
    },
  });
});

// ─── /.well-known/oauth-authorization-server ─────────────────────────────────
router.get('/.well-known/oauth-authorization-server', (req, res) => {
  setPublicCorsHeaders(res);
  const baseUrl = getBaseUrl(req);
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/authorize`,
    token_endpoint: `${baseUrl}/api/auth/token`,
    jwks_uri: `${baseUrl}/api/auth/jwks`,
    grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
    response_types_supported: ['code', 'token'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    scopes_supported: ['openid', 'profile', 'email', 'read', 'write'],
    agent_auth: {
      auth_md: `${baseUrl}/auth.md`,
      register_uri: `${baseUrl}/api/auth/agent-register`,
      identity_types_supported: ['anonymous', 'identity_assertion'],
      credential_types_supported: ['api_key', 'access_token'],
      claim_uri: `${baseUrl}/api/auth/claim`,
      revocation_uri: `${baseUrl}/api/auth/revoke`,
    },
  });
});

// ─── /.well-known/agent-skills/index.json ────────────────────────────────────
router.get('/.well-known/agent-skills/index.json', (req, res) => {
  setPublicCorsHeaders(res);
  const baseUrl = getBaseUrl(req);
  res.json({
    $schema: 'https://agentskills.io/schemas/v0.2.0/agent-skills-index.json',
    skills: [
      {
        name: 'Perplexta MCP Server',
        type: 'mcp',
        description: 'The Perplexta Platform MCP server allows AI agents to interface with the professional elite technical analysis suites, query databases, and invoke secure tools.',
        url: `${baseUrl}/.well-known/mcp/server-card.json`,
        sha256: '8120e2e2832148af1ca1ca25e219fb0ec577c41fe1d7a8d5f308cecfbb5aa95c',
        digest: '8120e2e2832148af1ca1ca25e219fb0ec577c41fe1d7a8d5f308cecfbb5aa95c',
      },
      {
        name: 'Perplexta OpenAPI Spec',
        type: 'openapi',
        description: 'Exposes technical metadata and standard full-stack routing pathways to execute enterprise actions.',
        url: `${baseUrl}/api/docs/openapi.json`,
        sha256: '2195f4118ea1b0dfab9ca0ea9fc52b0c577c41fe1d7a8d5f308cec5fbbaa95d',
        digest: '2195f4118ea1b0dfab9ca0ea9fc52b0c577c41fe1d7a8d5f308cec5fbbaa95d',
      },
      {
        name: 'Perplexta API Catalog',
        type: 'api-catalog',
        description: 'A linkset-based catalog pointing to description, documentation, and status endpoints.',
        url: `${baseUrl}/.well-known/api-catalog`,
        sha256: '61a0b32148af12ca0ea9fabca25ea219fb0ec577c41fe1a7a8f5f30cecfbb5aa',
        digest: '61a0b32148af12ca0ea9fabca25ea219fb0ec577c41fe1a7a8f5f30cecfbb5aa',
      },
    ],
  });
});

// ─── /.well-known/mcp/server-card.json ───────────────────────────────────────
router.get('/.well-known/mcp/server-card.json', (req, res) => {
  setPublicCorsHeaders(res);
  const baseUrl = getBaseUrl(req);
  res.json({
    serverInfo: { name: 'Perplexta Platform MCP Server', version: '1.0.0' },
    transport: { type: 'sse', endpoint: `${baseUrl}/api/mcp/sse`, url: `${baseUrl}/api/mcp/sse` },
    capabilities: {
      resources: { subscribe: true, listChanged: true },
      prompts: { listChanged: true },
      tools: { listChanged: true },
    },
    supportedProtocolVersions: ['2024-11-05'],
    instructions: 'The Perplexta Platform MCP server allows AI agents to interface with the professional elite technical analysis suites, query core and ledger databases, run semantic document searches, and invoke secure tools.',
  });
});

// ─── /.well-known/api-catalog ─────────────────────────────────────────────────
router.get('/.well-known/api-catalog', (req, res) => {
  setPublicCorsHeaders(res);
  const baseUrl = getBaseUrl(req);
  res.setHeader('Content-Type', 'application/linkset+json');
  res.json({
    linkset: [
      {
        anchor: `${baseUrl}/api`,
        'service-desc': [{ href: `${baseUrl}/api/docs/openapi.json`, type: 'application/openapi+json' }],
        'service-doc': [{ href: `${baseUrl}/#docs`, type: 'text/html' }],
        status: [{ href: `${baseUrl}/api/health`, type: 'application/json' }],
      },
    ],
  });
});

// ─── /.well-known/acp.json ────────────────────────────────────────────────────
router.get('/.well-known/acp.json', (req, res) => {
  setPublicCorsHeaders(res);
  const baseUrl = getBaseUrl(req);
  res.json({
    protocol: { name: 'acp', version: '1.0' },
    api_base_url: `${baseUrl}/api`,
    transports: ['http'],
    capabilities: { services: ['checkout'] },
  });
});

// ─── /api/auth/jwks ───────────────────────────────────────────────────────────
router.get('/api/auth/jwks', (req, res) => {
  setPublicCorsHeaders(res);
  const { jwk } = getOrCreateSigningKeys();
  res.json({ keys: [jwk] });
});

export default router;
