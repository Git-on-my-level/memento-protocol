/**
 * Simple TTL-based cache implementation with pattern-based invalidation
 * Replaces multiple independent caches with a unified caching strategy
 */
export class SimpleCache {
  private cache = new Map<string, { value: any; timestamp: number }>();
  private ttl: number; // milliseconds

  constructor(ttl: number = 60000) { // 60 seconds default
    this.ttl = ttl;
  }

  /**
   * Get a value from the cache
   * Returns null if key doesn't exist or has expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in the cache with current timestamp
   */
  set(key: string, value: any): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate all keys matching a pattern
   * Pattern can be a substring - all keys containing the pattern will be removed
   */
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get the current number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all cache keys (useful for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clean up expired entries manually
   * This is called automatically during get(), but can be called manually for cleanup
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    ttl: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const now = Date.now();
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const entry of this.cache.values()) {
      if (oldest === null || entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
      if (newest === null || entry.timestamp > newest) {
        newest = entry.timestamp;
      }
    }

    return {
      size: this.cache.size,
      ttl: this.ttl,
      oldestEntry: oldest ? now - oldest : null,
      newestEntry: newest ? now - newest : null
    };
  }
}