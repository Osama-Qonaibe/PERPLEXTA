#!/usr/bin/env bash

###############################################################################
# PERPLEXTA PLATFORM - TOTAL ZERO-FILL & DATABASE RESET SCRIPT
# Target Databases: platform_core | platform_ledger | platform_external | platform_security
# Description: Clears all tables, truncates records, and resets sequence identities to 1.
###############################################################################

set -e

# Resolve project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

echo "========================================================================"
echo "💥 [PERPLEXTA PLATFORM ZERO-FILL & TOTAL RESET]"
echo "Target Databases: platform_core | platform_ledger | platform_external | platform_security"
echo "========================================================================"

# Load environment configuration if available
if [ -f .env ]; then
  echo "📄 Loading environment configuration from .env..."
  # Export non-comment lines securely
  set -a
  source .env
  set +a
fi

# Fallback defaults for target platform databases
export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@127.0.0.1:5432/platform_core}"
export LEDGER_DATABASE_URL="${LEDGER_DATABASE_URL:-postgres://postgres:postgres@127.0.0.1:5432/platform_ledger}"
export EXTERNAL_DATABASE_URL="${EXTERNAL_DATABASE_URL:-postgres://postgres:postgres@127.0.0.1:5432/platform_external}"
export SECURITY_DATABASE_URL="${SECURITY_DATABASE_URL:-postgres://postgres:postgres@127.0.0.1:5432/platform_security}"

# Execute Zero-Fill Purge Engine
if command -v npx &> /dev/null; then
  echo "🚀 Executing Zero-Fill engine via tsx..."
  npx tsx server/scripts/zero_fill_platform_dbs.ts
else
  echo "❌ Error: npx/node runtime environment is required."
  exit 1
fi

echo "========================================================================"
echo "✅ PLATFORM ZERO-FILL & SEQUENCE RESET COMPLETE!"
echo "========================================================================"
