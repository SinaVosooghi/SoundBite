import { Injectable, Logger } from '@nestjs/common';
import {
  CacheProvider,
  CachedResponse,
} from '../interfaces/cache-provider.interface';

interface CacheEntry extends CachedResponse {
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

@Injectable()
export class InMemoryCacheProvider implements CacheProvider {
  private readonly logger = new Logger(InMemoryCacheProvider.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly MAX_SIZE = 10000; // Maximum number of cache entries
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Start periodic cleanup
    this.startCleanupTimer();
  }

  get(key: string): Promise<CachedResponse | undefined> {
    const cacheEntry = this.cache.get(key);

    if (!cacheEntry) {
      return Promise.resolve(undefined);
    }

    // Check if the cached response is still valid
    if (Date.now() > cacheEntry.expiresAt) {
      this.cache.delete(key);
      return Promise.resolve(undefined);
    }

    // Update access statistics
    cacheEntry.accessCount++;
    cacheEntry.lastAccessed = Date.now();

    // Return the cached response without the internal metadata
    const {
      expiresAt: _expiresAt,
      accessCount: _accessCount,
      lastAccessed: _lastAccessed,
      ...cachedResponse
    } = cacheEntry;
    return Promise.resolve(cachedResponse);
  }

  set(key: string, value: CachedResponse, ttl: number): Promise<void> {
    // Use provided TTL or fall back to default
    const effectiveTTL = ttl > 0 ? ttl : this.DEFAULT_TTL;

    // Check if we need to evict entries to make room
    if (this.cache.size >= this.MAX_SIZE) {
      this.evictOldest();
    }

    const cacheEntry: CacheEntry = {
      ...value,
      expiresAt: Date.now() + effectiveTTL,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, cacheEntry);
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.cache.delete(key);
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.cache.clear();
    this.logger.log('Cache cleared');
    return Promise.resolve();
  }

  size(): Promise<number> {
    // Clean up expired entries before returning size
    this.cleanupExpiredEntries();
    return Promise.resolve(this.cache.size);
  }

  keys(): Promise<string[]> {
    // Clean up expired entries before returning keys
    this.cleanupExpiredEntries();
    return Promise.resolve(Array.from(this.cache.keys()));
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.debug(`Cleaned up ${deletedCount} expired cache entries`);
    }
  }

  private evictOldest(): void {
    // Find the least recently used entry
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey !== null && oldestKey.length > 0) {
      this.cache.delete(oldestKey);
      this.logger.debug(
        `Evicted oldest cache entry: ${oldestKey.substring(0, 16)}...`,
      );
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.CLEANUP_INTERVAL);
  }

  // Cleanup method for graceful shutdown
  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}
