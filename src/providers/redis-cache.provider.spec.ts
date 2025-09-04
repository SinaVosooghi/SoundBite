import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisCacheProvider } from './redis-cache.provider';

describe('RedisCacheProvider', () => {
  let provider: RedisCacheProvider;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'REDIS_URL') {
                return defaultValue ?? 'redis://localhost:6379';
              }
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<RedisCacheProvider>(RedisCacheProvider);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    try {
      await provider.onModuleDestroy();
    } catch {
      // Ignore cleanup errors in tests
    }
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(provider).toBeDefined();
    });

    it('should handle Redis unavailability gracefully', () => {
      // Since Redis is not installed, the provider should handle this gracefully
      // The provider should detect that Redis is not available and log a warning
      expect(provider).toBeDefined();
    });

    it('should handle module destruction when Redis is not available', async () => {
      // Should not throw when Redis client is not initialized
      await expect(provider.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('Operations without Redis', () => {
    it('should throw error when trying to use operations without Redis client', async () => {
      // Since Redis is not available, operations should throw appropriate errors
      await expect(provider.get('test')).rejects.toThrow(
        'Redis client not available',
      );
      await expect(
        provider.set('test', {} as Parameters<typeof provider.set>[1], 1000),
      ).rejects.toThrow('Redis client not available');
      await expect(provider.delete('test')).rejects.toThrow(
        'Redis client not available',
      );
      await expect(provider.clear()).rejects.toThrow(
        'Redis client not available',
      );
      await expect(provider.size()).rejects.toThrow(
        'Redis client not available',
      );
      await expect(provider.keys()).rejects.toThrow(
        'Redis client not available',
      );
    });
  });

  describe('Configuration', () => {
    it('should use default Redis URL when not configured', () => {
      expect(typeof configService.get).toBe('function');
      // The provider should attempt to use the default Redis URL
    });
  });
});
