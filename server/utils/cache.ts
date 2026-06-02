class MemoryCache {
  private cache = new Map<string, { value: any; expiry: number }>();

  /**
   * Retrieves a value from the cache if it hasn't expired yet.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  /**
   * Stores a value in the cache with a specified TTL in milliseconds.
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  /**
   * Removes a specific key from the cache.
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Removes keys matching a pattern or starting with a prefix.
   */
  deletePattern(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Helper function that retrieves a value from the cache, or fetches and caches it if missing/expired.
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const fresh = await fetchFn();
    this.set(key, fresh, ttlMs);
    return fresh;
  }
}

export const memoryCache = new MemoryCache();
