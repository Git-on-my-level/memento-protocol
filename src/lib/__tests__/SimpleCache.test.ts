import { SimpleCache } from '../SimpleCache';

describe('SimpleCache', () => {
  let cache: SimpleCache;

  beforeEach(() => {
    cache = new SimpleCache(1000); // 1 second TTL for testing
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', { data: 'complex' });
      cache.set('key3', 42);

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toEqual({ data: 'complex' });
      expect(cache.get('key3')).toBe(42);
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'original');
      cache.set('key1', 'updated');
      expect(cache.get('key1')).toBe('updated');
    });

    it('should handle null and undefined values', () => {
      cache.set('null-key', null);
      cache.set('undefined-key', undefined);

      expect(cache.get('null-key')).toBeNull();
      expect(cache.get('undefined-key')).toBeUndefined();
    });
  });

  describe('TTL behavior', () => {
    it('should expire entries after TTL', async () => {
      cache.set('expiring-key', 'value');
      expect(cache.get('expiring-key')).toBe('value');

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(cache.get('expiring-key')).toBeNull();
    });

    it('should not expire entries before TTL', async () => {
      cache.set('fresh-key', 'value');
      expect(cache.get('fresh-key')).toBe('value');

      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(cache.get('fresh-key')).toBe('value');
    });

    it('should use default TTL when none specified', () => {
      const defaultCache = new SimpleCache();
      expect(defaultCache.getStats().ttl).toBe(60000); // 60 seconds
    });

    it('should respect custom TTL', () => {
      const customCache = new SimpleCache(5000);
      expect(customCache.getStats().ttl).toBe(5000);
    });
  });

  describe('cache management', () => {
    it('should delete specific keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.delete('key1');

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
      expect(cache.size()).toBe(0);
    });

    it('should track cache size correctly', () => {
      expect(cache.size()).toBe(0);

      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      cache.delete('key1');
      expect(cache.size()).toBe(1);

      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('pattern invalidation', () => {
    it('should invalidate keys matching a pattern', () => {
      cache.set('user:123:profile', { name: 'John' });
      cache.set('user:123:settings', { theme: 'dark' });
      cache.set('user:456:profile', { name: 'Jane' });
      cache.set('post:123:comments', ['comment1']);

      cache.invalidatePattern('user:123');

      expect(cache.get('user:123:profile')).toBeNull();
      expect(cache.get('user:123:settings')).toBeNull();
      expect(cache.get('user:456:profile')).toEqual({ name: 'Jane' });
      expect(cache.get('post:123:comments')).toEqual(['comment1']);
    });

    it('should handle empty patterns gracefully', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.invalidatePattern('');

      // Empty pattern should match all keys
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('should handle non-matching patterns', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.invalidatePattern('nonexistent');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });
  });

  describe('utility methods', () => {
    it('should return all cache keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys).toHaveLength(3);
    });

    it('should check if key exists and is not expired', () => {
      cache.set('existing-key', 'value');

      expect(cache.has('existing-key')).toBe(true);
      expect(cache.has('nonexistent-key')).toBe(false);
    });

    it('should check expired keys correctly', async () => {
      cache.set('expiring-key', 'value');
      expect(cache.has('expiring-key')).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(cache.has('expiring-key')).toBe(false);
    });
  });

  describe('cleanup functionality', () => {
    it('should manually clean up expired entries', async () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.size()).toBe(3);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const removedCount = cache.cleanup();
      expect(removedCount).toBe(3);
      expect(cache.size()).toBe(0);
    });

    it('should not remove non-expired entries during cleanup', async () => {
      cache.set('old-key', 'old-value');
      
      // Wait for first key to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      cache.set('new-key', 'new-value');

      const removedCount = cache.cleanup();
      expect(removedCount).toBe(1);
      expect(cache.size()).toBe(1);
      expect(cache.get('new-key')).toBe('new-value');
      expect(cache.get('old-key')).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should provide cache statistics', () => {
      const stats = cache.getStats();

      expect(stats.size).toBe(0);
      expect(stats.ttl).toBe(1000);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });

    it('should track entry age statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.oldestEntry).toBeGreaterThanOrEqual(0);
      expect(stats.newestEntry).toBeGreaterThanOrEqual(0);
      expect(stats.oldestEntry).toBeLessThan(100); // Should be very recent
      expect(stats.newestEntry).toBeLessThan(100); // Should be very recent
    });
  });

  describe('edge cases', () => {
    it('should handle very large number of entries', () => {
      const numEntries = 10000;
      
      for (let i = 0; i < numEntries; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      expect(cache.size()).toBe(numEntries);
      expect(cache.get('key0')).toBe('value0');
      expect(cache.get(`key${numEntries - 1}`)).toBe(`value${numEntries - 1}`);
    });

    it('should handle concurrent access patterns', () => {
      const key = 'concurrent-key';
      
      cache.set(key, 'value1');
      expect(cache.get(key)).toBe('value1');
      
      cache.set(key, 'value2');
      expect(cache.get(key)).toBe('value2');
      
      cache.delete(key);
      expect(cache.get(key)).toBeNull();
    });

    it('should handle keys with special characters', () => {
      const specialKeys = [
        'key:with:colons',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key/with/slashes',
        'key with spaces',
        'key|with|pipes',
        'key@with@symbols'
      ];

      specialKeys.forEach(key => {
        cache.set(key, `value-for-${key}`);
        expect(cache.get(key)).toBe(`value-for-${key}`);
      });
    });
  });
});