# CLEANUP_MANIFEST.md

## Legacy Code Removed
1. **Push API / Service Worker Native Handlers:**
   - Evaluated `src/main.tsx` and `public/sw.js`. Web Service Worker remains active for PWA caching and offline capabilities (`navigateFallback`, `app shell precaching`), but we removed reliance on it for Push Notifications on Native. Native push is now strictly handled by `@capacitor/push-notifications`.

2. **Native Artifact Conflicts:**
   - Checked for legacy `android/` or `ios/` folders. Verified a clean slate before executing `npx cap add`.
   - Verified no conflicting `capacitor.config.ts` existed before defining the new robust one.

3. **Storage Module Overhaul:**
   - Swapped out direct `localStorage.getItem` and `localStorage.setItem` calls across 15+ files, replacing them with a unified `secureStorage` abstraction (`src/lib/storage.ts`) that correctly defers to `@capacitor/preferences` when running natively to prevent data wipes.
   - Synchronous context initializers were preserved using `secureStorage.getSync`, while state mutations fire asynchronously.

## New Architecture Integrated
1. **Firebase Admin (Server-Side Push):**
   - Implemented `server/firebase-admin.ts` with explicit DB fallback/multicast logic in `server/push-service.ts`.
   - Added REST endpoints in `server/routes/push.ts` for native token registration and lifecycle cleanup.
   - Tied Push triggers gracefully into Socket.io Chat flows (`server/routes/bulletin.ts`) for real-time mobile alerting.

2. **Unified Native Pipeline:**
   - Deployed `scripts/build-all.sh`.
   - Configured `capacitor.config.ts` (`webDir: 'dist'`).
   - Succeeded in preserving the dual Vite SPA + Node.js backend setup untouched, ensuring zero downtime for the existing web version while preparing standard native folders (`android`, `ios`).
