# auth.md

This file describes how agents can register and authenticate on behalf of perplexta.com.

## agent_auth

- register_uri: https://perplexta.com/api/auth/agent-register
- supported_identity_types: email, oauth
- supported_credential_types: api_key, access_token
- claim_uri: https://perplexta.com/api/auth/claim
- revocation_uri: https://perplexta.com/api/auth/revoke

## Supported Flows

- **agent-verified**: Agent-attested identity, no human interaction required
- **user-claimed**: OTP-based, human confirms via email

## Scopes

- `read:profile` — Read user profile
- `write:content` — Create and edit content
- `read:data` — Access user data

## More Info

- Protocol: https://workos.com/auth-md
- GitHub: https://github.com/workos/auth.md
