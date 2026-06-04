# Agent Authentication & Registration - Perplexta Platform

Welcome to the Perplexta Platform Agent Registration and Authentication guide. This system supports programmatic discovery and automated registration for software agents and AI integrations.

## Discovery Metadata
Automated agents can discover registration and authentication capabilities by querying our standard endpoints:
- **OpenID Discovery**: /.well-known/openid-configuration
- **OAuth Discovery**: /.well-known/oauth-authorization-server
- **Protected Resources**: /.well-known/oauth-protected-resource
- **Catalog**: /.well-known/api-catalog

## Registration Flow
Agents must complete dynamic client registration via the `register_uri` described in the metadata.

### 1. Dynamic Client Registration
To register your agent, submit a `POST` request to the registration endpoint:
```http
POST /api/auth/register-agent
Content-Type: application/json

{
  "client_name": "My AI Agent",
  "identity_type": "agent",
  "credential_type": "client_credentials",
  "redirect_uris": ["https://myagent.com/callback"]
}
```

Response:
```json
{
  "client_id": "agent_client_12345",
  "client_secret": "agent_secret_67890",
  "client_secret_expires_at": 0
}
```

### 2. Obtaining an Access Token
You can obtain an access token using standard OAuth 2.0 Client Credentials or Authorization Code flow:
```http
POST /api/auth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=agent_client_12345&client_secret=agent_secret_67890
```

Response:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsIn...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write"
}
```

## Security & Claim Support
You may access claim and revocation endpoints to verify credentials:
- **Claim API**: /api/auth/claim
- **Revocation API**: /api/auth/revoke

For support, please refer to the main portal or contact developer support.
