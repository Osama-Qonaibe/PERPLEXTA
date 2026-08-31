import { safeStorageGet, safeStorageSet, safeStorageRemove } from "@/utils/safeStorage";
export class VersionManager {
  private static STORAGE_KEY = 'perplexta_build_hash';

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

      const localHash = safeStorageGet(this.STORAGE_KEY);

      if (!localHash) {
        safeStorageSet(this.STORAGE_KEY, serverHash);
      } else if (localHash !== serverHash) {
        console.log('[VersionManager] New build detected. Signalling update...');
        safeStorageSet(this.STORAGE_KEY, serverHash);
        
        // Signal that a version change was detected without force-reloading
        window.dispatchEvent(new CustomEvent('pwa-version-mismatch', { detail: { serverHash } }));
      }
    } catch (err) {
      console.warn('[VersionManager] Version check failed:', err);
    }
  }

  public static initAutoCheck(intervalMs = 15 * 60 * 1000) {
    // Check on startup after a short delay
    setTimeout(() => {
      this.checkVersion();
    }, 2000);

    // Check periodically
    setInterval(() => {
      this.checkVersion();
    }, intervalMs);

    // Check when user returns to tab / focuses window
    window.addEventListener('focus', () => {
      this.checkVersion();
    });
  }
}
