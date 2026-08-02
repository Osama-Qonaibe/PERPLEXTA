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

      const localHash = localStorage.getItem(this.STORAGE_KEY);

      if (!localHash) {
        localStorage.setItem(this.STORAGE_KEY, serverHash);
      } else if (localHash !== serverHash) {
        console.log('[VersionManager] New build detected. Reloading to apply fresh assets...');
        localStorage.setItem(this.STORAGE_KEY, serverHash);
        
        // Unregister service workers to clear old cache
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          } catch (e) {
            console.error('[VersionManager] SW unregister error:', e);
          }
        }

        // Clear browser cache storage
        if ('caches' in window) {
          try {
            const cacheNames = await caches.keys();
            for (const name of cacheNames) {
              await caches.delete(name);
            }
          } catch (e) {
            console.error('[VersionManager] Caches delete error:', e);
          }
        }

        window.location.reload();
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
