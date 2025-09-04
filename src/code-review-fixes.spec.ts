import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SoundbiteValidator } from './validators/soundbite.validator';
import { ValidationService } from './services/validation.service';
import { InMemoryCacheProvider } from './providers/in-memory-cache.provider';
import type { CacheProvider } from './interfaces/cache-provider.interface';

describe('Code Review Fixes', () => {
  let validator: SoundbiteValidator;
  let cacheProvider: CacheProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoundbiteValidator,
        ValidationService,
        InMemoryCacheProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
          },
        },
      ],
    }).compile();

    validator = module.get<SoundbiteValidator>(SoundbiteValidator);
    cacheProvider = module.get<InMemoryCacheProvider>(InMemoryCacheProvider);
  });

  describe('SoundbiteValidator', () => {
    it('should be defined', () => {
      expect(validator).toBeDefined();
    });

    it('should validate valid text', () => {
      expect(() => validator.validateText('Hello, world!')).not.toThrow();
    });

    it('should reject empty text', () => {
      expect(() => validator.validateText('')).toThrow();
      expect(() => validator.validateText('   ')).toThrow();
    });

    it('should reject text that is too long', () => {
      const longText = 'a'.repeat(3001);
      expect(() => validator.validateText(longText)).toThrow();
    });

    it('should validate valid voice ID', () => {
      expect(() => validator.validateVoiceId('Joanna')).not.toThrow();
      expect(() => validator.validateVoiceId('Matthew')).not.toThrow();
    });

    it('should reject invalid voice ID', () => {
      expect(() => validator.validateVoiceId('InvalidVoice')).toThrow();
    });

    it('should allow undefined voice ID', () => {
      expect(() => validator.validateVoiceId()).not.toThrow();
      expect(() => validator.validateVoiceId(undefined)).not.toThrow();
    });

    it('should return supported voices', () => {
      const voices = validator.getSupportedVoices();
      expect(voices).toContain('Joanna');
      expect(voices).toContain('Matthew');
      expect(voices.length).toBeGreaterThan(10);
    });

    it('should return max text length', () => {
      expect(validator.getMaxTextLength()).toBe(3000);
    });
  });

  describe('InMemoryCacheProvider', () => {
    it('should be defined', () => {
      expect(cacheProvider).toBeDefined();
    });

    it('should set and get cache entries', async () => {
      const key = 'test-key';
      const value = {
        response: { message: 'test' },
        timestamp: Date.now(),
        status: 200,
      };

      await cacheProvider.set(key, value, 3600);
      const retrieved = await cacheProvider.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent keys', async () => {
      const result = await cacheProvider.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should delete cache entries', async () => {
      const key = 'test-key-delete';
      const value = {
        response: { message: 'test' },
        timestamp: Date.now(),
        status: 200,
      };

      await cacheProvider.set(key, value, 3600);
      await cacheProvider.delete(key);

      const result = await cacheProvider.get(key);
      expect(result).toBeUndefined();
    });

    it('should clear all cache entries', async () => {
      await cacheProvider.set(
        'key1',
        { response: {}, timestamp: Date.now(), status: 200 },
        3600,
      );
      await cacheProvider.set(
        'key2',
        { response: {}, timestamp: Date.now(), status: 200 },
        3600,
      );

      await cacheProvider.clear();

      expect(await cacheProvider.size()).toBe(0);
    });

    it('should return cache size', async () => {
      await cacheProvider.clear();
      expect(await cacheProvider.size()).toBe(0);

      await cacheProvider.set(
        'key1',
        { response: {}, timestamp: Date.now(), status: 200 },
        3600,
      );
      expect(await cacheProvider.size()).toBe(1);
    });

    it('should return cache keys', async () => {
      await cacheProvider.clear();
      await cacheProvider.set(
        'key1',
        { response: {}, timestamp: Date.now(), status: 200 },
        3600,
      );
      await cacheProvider.set(
        'key2',
        { response: {}, timestamp: Date.now(), status: 200 },
        3600,
      );

      const keys = await cacheProvider.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });
  });
});
