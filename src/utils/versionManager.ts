import { safeStorageGet, safeStorageSet, safeStorageRemove } from "@/utils/safeStorage";

export class VersionManager {
  private static STORAGE_KEY = 'perplexta_build_hash';
  private static DISMISSED_KEY = 'perplexta_dismissed_build_hash';
  private static latestServerHash: string | null = null;

  public static async checkVersion(): Promise<void> {
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) return;

      const data = await response.json();
      const serverHash = data.buildHash || data.timestamp?.toString();
      if (!serverHash) return;

      this.latestServerHash = serverHash;

      const localHash = safeStorageGet(this.STORAGE_KEY);
      const dismissedHash = safeStorageGet(this.DISMISSED_KEY);

      if (!localHash) {
        // Initial setup on clean storage: store current hash to avoid immediate popup
        safeStorageSet(this.STORAGE_KEY, serverHash);
      } else if (localHash !== serverHash) {
        // Check if user already dismissed this specific server build hash
        if (dismissedHash === serverHash) {
          return;
        }

        console.log('[VersionManager] Real code change detected on server. Signalling update...');
        // Dispatch event with details so UI can prompt user
        window.dispatchEvent(new CustomEvent('pwa-version-mismatch', {
          detail: { serverHash, previousHash: localHash }
        }));
      }
    } catch (err) {
      console.warn('[VersionManager] Version check failed:', err);
    }
  }

  /**
   * Dismiss the update notification for a specific build hash so it won't pop up again
   * until a NEW code change / server build is deployed.
   */
  public static dismissVersion(serverHash: string): void {
    if (serverHash) {
      safeStorageSet(this.DISMISSED_KEY, serverHash);
    }
  }

  /**
   * Execute a smooth reload upon user clicking "Update Now":
   * 1. Save new server hash to local storage
   * 2. Clear dismissed hash state
   * 3. Reload page seamlessly while preserving cookie consent and PWA assets
   */
  public static async applyHardReset(targetHash?: string): Promise<void> {
    const hashToSave = targetHash || this.latestServerHash;
    if (hashToSave) {
      safeStorageSet(this.STORAGE_KEY, hashToSave);
      safeStorageRemove(this.DISMISSED_KEY);
    }

    const url = new URL(window.location.href);
    url.searchParams.set('_r', Date.now().toString(36));
    window.location.href = url.toString();
  }

  public static initAutoCheck(intervalMs = 5 * 60 * 1000) {
    // Check on startup after a short delay
    setTimeout(() => {
      this.checkVersion();
    }, 2000);

    // Cron job: check periodically every 5 minutes
    setInterval(() => {
      this.checkVersion();
    }, intervalMs);

    // Check when user returns to tab / focuses window
    window.addEventListener('focus', () => {
      this.checkVersion();
    });
  }
}

