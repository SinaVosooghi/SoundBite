import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CacheProvider,
  CachedResponse,
} from '../interfaces/cache-provider.interface';

// Redis client interface for type safety
interface RedisClient {
  get(key: string): Promise<string | null>;
  setEx(key: string, seconds: number, value: string): Promise<string>;
  del(key: string): Promise<number>;
  flushAll(): Promise<string>;
  dbSize(): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  ping(): Promise<string>;
  quit(): Promise<string>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  connect(): Promise<void>;
  isReady: boolean;
}

@Injectable()
export class RedisCacheProvider
  implements CacheProvider, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisCacheProvider.name);
  private redisClient: RedisClient | null = null;
  private readonly isRedisAvailable: boolean;
  private readonly keyPrefix = 'soundbite:idempotency:';
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(private readonly configService: ConfigService) {
    // Check if Redis is available
    this.isRedisAvailable = this.checkRedisAvailability();

    if (!this.isRedisAvailable) {
      this.logger.warn(
        'Redis package not available. Install redis package to enable Redis caching.',
      );
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.isRedisAvailable) {
      await this.initializeRedisClient();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        this.logger.log('Redis connection closed');
      } catch (error) {
        this.logger.error('Error closing Redis connection:', error);
      }
    }
  }

  async get(key: string): Promise<CachedResponse | undefined> {
    if (this.redisClient?.isReady !== true) {
      throw new Error('Redis client not available');
    }

    try {
      const fullKey = this.keyPrefix + key;
      const result = await this.executeWithRetry(() => {
        if (!this.redisClient) {
          throw new Error('Redis client not available');
        }
        return this.redisClient.get(fullKey);
      });

      if (result === null || result === undefined || result.length === 0) {
        return undefined;
      }

      return JSON.parse(result) as CachedResponse;
    } catch (error) {
      this.logger.error('Redis get error:', error);
      throw error;
    }
  }

  async set(key: string, value: CachedResponse, ttl: number): Promise<void> {
    if (this.redisClient?.isReady !== true) {
      throw new Error('Redis client not available');
    }

    try {
      const fullKey = this.keyPrefix + key;
      const serializedValue = JSON.stringify(value);
      const ttlSeconds = Math.ceil(ttl / 1000); // Convert milliseconds to seconds

      await this.executeWithRetry(() => {
        if (!this.redisClient) {
          throw new Error('Redis client not available');
        }
        return this.redisClient.setEx(fullKey, ttlSeconds, serializedValue);
      });
    } catch (error) {
      this.logger.error('Redis set error:', error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    if (this.redisClient?.isReady !== true) {
      throw new Error('Redis client not available');
    }

    try {
      const fullKey = this.keyPrefix + key;
      await this.executeWithRetry(() => {
        if (!this.redisClient) {
          throw new Error('Redis client not available');
        }
        return this.redisClient.del(fullKey);
      });
    } catch (error) {
      this.logger.error('Redis delete error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    if (this.redisClient?.isReady !== true) {
      throw new Error('Redis client not available');
    }

    try {
      // Get all keys with our prefix and delete them
      const keys = await this.executeWithRetry(() => {
        if (!this.redisClient) {
          throw new Error('Redis client not available');
        }
        return this.redisClient.keys(this.keyPrefix + '*');
      });

      if (keys.length > 0) {
        for (const key of keys) {
          await this.executeWithRetry(() => {
            if (!this.redisClient) {
              throw new Error('Redis client not available');
            }
            return this.redisClient.del(key);
          });
        }
        this.logger.log(`Cleared ${keys.length} cache entries`);
      }
    } catch (error) {
      this.logger.error('Redis clear error:', error);
      throw error;
    }
  }

  async size(): Promise<number> {
    if (this.redisClient?.isReady !== true) {
      throw new Error('Redis client not available');
    }

    try {
      const keys = await this.executeWithRetry(() => {
        if (!this.redisClient) {
          throw new Error('Redis client not available');
        }
        return this.redisClient.keys(this.keyPrefix + '*');
      });
      return keys.length;
    } catch (error) {
      this.logger.error('Redis size error:', error);
      throw error;
    }
  }

  async keys(): Promise<string[]> {
    if (this.redisClient?.isReady !== true) {
      throw new Error('Redis client not available');
    }

    try {
      const fullKeys = await this.executeWithRetry(() => {
        if (!this.redisClient) {
          throw new Error('Redis client not available');
        }
        return this.redisClient.keys(this.keyPrefix + '*');
      });

      // Remove the prefix from keys before returning
      return fullKeys.map((key) => key.replace(this.keyPrefix, ''));
    } catch (error) {
      this.logger.error('Redis keys error:', error);
      throw error;
    }
  }

  private async initializeRedisClient(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let redis: any;
      try {
        // Use dynamic import with error handling
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        redis = await eval('import("redis")');
      } catch (_importError) {
        this.logger.warn(
          'Redis module not available. Redis caching will be disabled.',
        );
        throw new Error('Redis client not available');
      }
      const redisUrl = this.configService.get<string>(
        'REDIS_URL',
        'redis://localhost:6379',
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.redisClient = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              this.logger.error('Redis reconnection failed after 10 attempts');
              return false;
            }
            return Math.min(retries * 100, 3000);
          },
        },
      }) as RedisClient;

      this.redisClient.on('error', (error: Error) => {
        this.logger.error('Redis client error:', error);
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Connected to Redis');
      });

      this.redisClient.on('reconnecting', () => {
        this.logger.warn('Reconnecting to Redis...');
      });

      this.redisClient.on('ready', () => {
        this.logger.log('Redis client ready');
      });

      await this.redisClient.connect();

      // Test the connection
      await this.redisClient.ping();
      this.logger.log('Redis connection established successfully');
    } catch (error) {
      this.logger.error(
        'Failed to initialize Redis client:',
        error instanceof Error ? error.message : String(error),
      );
      this.redisClient = null;
      throw error;
    }
  }

  private checkRedisAvailability(): boolean {
    try {
      require.resolve('redis');
      return true;
    } catch {
      return false;
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.maxRetries) {
          break;
        }

        this.logger.warn(
          `Redis operation failed (attempt ${attempt}/${this.maxRetries}):`,
          error,
        );
        await this.sleep(this.retryDelay * attempt);
      }
    }

    throw lastError ?? new Error('Redis operation failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
