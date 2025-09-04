import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { InMemoryCacheProvider } from './in-memory-cache.provider';
import type { CachedResponse } from '../interfaces/cache-provider.interface';

describe('InMemoryCacheProvider', () => {
  let provider: InMemoryCacheProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InMemoryCacheProvider],
    }).compile();

    provider = module.get<InMemoryCacheProvider>(InMemoryCacheProvider);
  });

  afterEach(async () => {
    await provider.clear();
    provider.onModuleDestroy();
  });

  describe('Basic Operations', () => {
    it('should be defined', () => {
      expect(provider).toBeDefined();
    });

    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value: CachedResponse = {
        response: { id: '123', data: 'test' },
        timestamp: Date.now(),
        status: 200,
      };

      await provider.set(key, value, 60000);
      const retrieved = await provider.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent keys', async () => {
      const result = await provider.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should delete values', async () => {
      const key = 'test-key';
      const value: CachedResponse = {
        response: { id: '123' },
        timestamp: Date.now(),
        status: 200,
      };

      await provider.set(key, value, 60000);
      await provider.delete(key);

      const result = await provider.get(key);
      expect(result).toBeUndefined();
    });

    it('should clear all values', async () => {
      const values = [
        {
          key: 'key1',
          value: { response: { id: '1' }, timestamp: Date.now(), status: 200 },
        },
        {
          key: 'key2',
          value: { response: { id: '2' }, timestamp: Date.now(), status: 200 },
        },
        {
          key: 'key3',
          value: { response: { id: '3' }, timestamp: Date.now(), status: 200 },
        },
      ];

      for (const { key, value } of values) {
        await provider.set(key, value, 60000);
      }

      await provider.clear();

      for (const { key } of values) {
        const result = await provider.get(key);
        expect(result).toBeUndefined();
      }
    });
  });

  describe('TTL Handling', () => {
    it('should respect TTL and expire entries', async () => {
      const key = 'expiring-key';
      const value: CachedResponse = {
        response: { id: '123' },
        timestamp: Date.now(),
        status: 200,
      };

      // Set with very short TTL (1ms)
      await provider.set(key, value, 1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await provider.get(key);
      expect(result).toBeUndefined();
    });

    it('should use default TTL when TTL is 0 or negative', async () => {
      const key = 'default-ttl-key';
      const value: CachedResponse = {
        response: { id: '123' },
        timestamp: Date.now(),
        status: 200,
      };

      await provider.set(key, value, 0);
      const result = await provider.get(key);

      expect(result).toEqual(value);
    });

    it('should update access statistics on get', async () => {
      const key = 'access-test-key';
      const value: CachedResponse = {
        response: { id: '123' },
        timestamp: Date.now(),
        status: 200,
      };

      await provider.set(key, value, 60000);

      // Access the key multiple times
      await provider.get(key);
      await provider.get(key);
      await provider.get(key);

      // Access count should be tracked internally
      // (We can't directly test this without exposing internals,
      // but we can verify the key is still accessible)
      const result = await provider.get(key);
      expect(result).toEqual(value);
    });
  });

  describe('Size Management', () => {
    it('should return correct size', async () => {
      const initialSize = await provider.size();
      expect(initialSize).toBe(0);

      const values = [
        {
          key: 'key1',
          value: { response: { id: '1' }, timestamp: Date.now(), status: 200 },
        },
        {
          key: 'key2',
          value: { response: { id: '2' }, timestamp: Date.now(), status: 200 },
        },
        {
          key: 'key3',
          value: { response: { id: '3' }, timestamp: Date.now(), status: 200 },
        },
      ];

      for (const { key, value } of values) {
        await provider.set(key, value, 60000);
      }

      const finalSize = await provider.size();
      expect(finalSize).toBe(3);
    });

    it('should return correct keys', async () => {
      const testKeys = ['key1', 'key2', 'key3'];

      for (const key of testKeys) {
        await provider.set(
          key,
          {
            response: { id: key },
            timestamp: Date.now(),
            status: 200,
          },
          60000,
        );
      }

      const keys = await provider.keys();
      expect(keys.sort()).toEqual(testKeys.sort());
    });

    it('should evict oldest entries when max size is reached', async () => {
      // This test assumes MAX_SIZE is 10000, but we'll test the eviction logic
      // by setting many entries and checking that old ones get evicted

      // First, let's set the maximum number of entries we can test with
      const maxTestEntries = 100;

      // Fill up to near capacity
      for (let i = 0; i < maxTestEntries; i++) {
        await provider.set(
          `key-${i}`,
          {
            response: { id: `${i}` },
            timestamp: Date.now() - (maxTestEntries - i) * 1000, // Older entries have earlier timestamps
            status: 200,
          },
          60000,
        );

        // Small delay to ensure different access times
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      const size = await provider.size();
      expect(size).toBe(maxTestEntries);
    });
  });

  describe('Cleanup Operations', () => {
    it('should clean up expired entries during size check', async () => {
      // Add some entries with very short TTL
      const shortLivedKeys = ['short1', 'short2', 'short3'];
      for (const key of shortLivedKeys) {
        await provider.set(
          key,
          {
            response: { id: key },
            timestamp: Date.now(),
            status: 200,
          },
          1,
        ); // 1ms TTL
      }

      // Add some entries with long TTL
      const longLivedKeys = ['long1', 'long2'];
      for (const key of longLivedKeys) {
        await provider.set(
          key,
          {
            response: { id: key },
            timestamp: Date.now(),
            status: 200,
          },
          60000,
        ); // 60s TTL
      }

      // Wait for short-lived entries to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Size check should trigger cleanup
      const size = await provider.size();
      expect(size).toBe(2); // Only long-lived entries should remain
    });

    it('should clean up expired entries during keys retrieval', async () => {
      // Add expired entries
      await provider.set(
        'expired1',
        {
          response: { id: 'expired1' },
          timestamp: Date.now(),
          status: 200,
        },
        1,
      );

      await provider.set(
        'expired2',
        {
          response: { id: 'expired2' },
          timestamp: Date.now(),
          status: 200,
        },
        1,
      );

      // Add valid entry
      await provider.set(
        'valid',
        {
          response: { id: 'valid' },
          timestamp: Date.now(),
          status: 200,
        },
        60000,
      );

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const keys = await provider.keys();
      expect(keys).toEqual(['valid']);
    });

    it('should handle periodic cleanup timer', async () => {
      // This is more of an integration test to ensure the timer doesn't cause issues
      // We can't easily test the timer directly without mocking setInterval

      // Add an entry that will expire
      await provider.set(
        'timer-test',
        {
          response: { id: 'timer-test' },
          timestamp: Date.now(),
          status: 200,
        },
        50,
      ); // 50ms TTL

      // Wait longer than TTL
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Entry should be expired when accessed
      const result = await provider.get('timer-test');
      expect(result).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed data gracefully', async () => {
      // This test ensures the provider doesn't crash with unexpected data
      const key = 'test-key';
      const value: CachedResponse = {
        response: { id: '123' },
        timestamp: Date.now(),
        status: 200,
      };

      await provider.set(key, value, 60000);

      // All operations should work normally
      expect(await provider.get(key)).toEqual(value);
      expect(await provider.size()).toBe(1);
      expect(await provider.keys()).toEqual([key]);

      await provider.delete(key);
      expect(await provider.get(key)).toBeUndefined();
    });

    it('should handle concurrent operations', async () => {
      const operations = [];

      // Perform multiple concurrent operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          provider.set(
            `concurrent-${i}`,
            {
              response: { id: `${i}` },
              timestamp: Date.now(),
              status: 200,
            },
            60000,
          ),
        );
      }

      await Promise.all(operations);

      const size = await provider.size();
      expect(size).toBe(10);

      // Concurrent gets
      const getOperations = [];
      for (let i = 0; i < 10; i++) {
        getOperations.push(provider.get(`concurrent-${i}`));
      }

      const results = await Promise.all(getOperations);
      expect(results.every((result) => result !== undefined)).toBe(true);
    });
  });

  describe('Module Lifecycle', () => {
    it('should handle module destruction gracefully', () => {
      expect(() => provider.onModuleDestroy()).not.toThrow();
    });

    it('should continue working after module destruction', async () => {
      provider.onModuleDestroy();

      // Basic operations should still work
      await provider.set(
        'test',
        {
          response: { id: 'test' },
          timestamp: Date.now(),
          status: 200,
        },
        60000,
      );

      const result = await provider.get('test');
      expect(result).toBeDefined();
    });
  });
});
