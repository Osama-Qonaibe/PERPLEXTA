#!/bin/bash
set -e

echo "==================================="
echo "   Perplexta Unified Build 🚀      "
echo "==================================="

echo "[1/4] Building Web App and Server..."
npm run build

echo "[2/4] Syncing Native Mobile Assets (Capacitor)..."
npx cap sync

echo "[3/4] Done! The full stack is ready."
echo "-> Web/Server is at /dist and dist/server.cjs"
echo "-> Android source is ready in /android"
echo "-> iOS source is ready in /ios"
