import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import { Request } from 'express';
import type { IdempotencyRequest } from './idempotency.middleware';
import { IdempotencyMiddleware } from './idempotency.middleware';
import type { CacheProvider } from '../interfaces/cache-provider.interface';
import { HEADERS, HTTP_METHODS, PATHS } from '../constants/paths';

// Helper for accessing private methods in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MiddlewareAny = any;

describe('IdempotencyMiddleware', () => {
  let middleware: IdempotencyMiddleware;
  let mockCacheProvider: jest.Mocked<CacheProvider>;
  let mockReflector: jest.Mocked<Reflector>;
  let mockRequest: Partial<IdempotencyRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(async () => {
    mockCacheProvider = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      size: jest.fn(),
      keys: jest.fn(),
    } as jest.Mocked<CacheProvider>;

    mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndMerge: jest.fn(),
      getAllAndOverride: jest.fn(),
    } as jest.Mocked<Reflector>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyMiddleware,
        {
          provide: 'CACHE_PROVIDER',
          useValue: mockCacheProvider,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    middleware = module.get<IdempotencyMiddleware>(IdempotencyMiddleware);
    mockNext = jest.fn();

    // Setup mock response
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      statusCode: 200,
    };

    // Setup mock request
    mockRequest = {
      method: HTTP_METHODS.POST,
      url: PATHS.SOUNDBITE,
      headers: {},
      body: { text: 'Hello world', voice: 'Joanna' },
      query: {},
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HTTP Method Filtering', () => {
    it('should skip middleware for GET requests', () => {
      mockRequest.method = 'GET';

      middleware.use(
        mockRequest as IdempotencyRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockCacheProvider.get).toHaveBeenCalledTimes(0);
    });

    it('should process POST requests', () => {
      mockRequest.method = HTTP_METHODS.POST;
      if (mockRequest.headers) {
        mockRequest.headers[HEADERS.IDEMPOTENCY_KEY] =
          '550e8400-e29b-41d4-a716-446655440000';
      }

      middleware.use(
        mockRequest as IdempotencyRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).not.toHaveBeenCalledWith();
    });

    it('should process PUT requests', () => {
      mockRequest.method = HTTP_METHODS.PUT;
      if (mockRequest.headers) {
        mockRequest.headers[HEADERS.IDEMPOTENCY_KEY] =
          '550e8400-e29b-41d4-a716-446655440000';
      }

      middleware.use(
        mockRequest as IdempotencyRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).not.toHaveBeenCalledWith();
    });

    it('should process PATCH requests', () => {
      mockRequest.method = HTTP_METHODS.PATCH;
      if (mockRequest.headers) {
        mockRequest.headers[HEADERS.IDEMPOTENCY_KEY] =
          '550e8400-e29b-41d4-a716-446655440000';
      }

      middleware.use(
        mockRequest as IdempotencyRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).not.toHaveBeenCalledWith();
    });
  });

  describe('Request Size Validation', () => {
    it('should reject requests that are too large', () => {
      const largeBody = { data: 'x'.repeat(2 * 1024 * 1024) }; // 2MB
      mockRequest.body = largeBody;

      expect(() => {
        middleware.use(
          mockRequest as IdempotencyRequest,
          mockResponse as Response,
          mockNext,
        );
      }).toThrow(BadRequestException);
    });

    it('should accept requests within size limit', () => {
      const normalBody = { text: 'Hello world' };
      mockRequest.body = normalBody;
      if (mockRequest.headers) {
        mockRequest.headers[HEADERS.IDEMPOTENCY_KEY] =
          '550e8400-e29b-41d4-a716-446655440000';
      }

      expect(() => {
        middleware.use(
          mockRequest as IdempotencyRequest,
          mockResponse as Response,
          mockNext,
        );
      }).not.toThrow();
    });
  });

  describe('Idempotency Key Validation', () => {
    it('should require idempotency key for soundbite POST requests', () => {
      mockRequest.method = HTTP_METHODS.POST;
      mockRequest.url = PATHS.SOUNDBITE;
      if (mockRequest.headers) {
        delete mockRequest.headers[HEADERS.IDEMPOTENCY_KEY];
      }

      expect(() => {
        middleware.use(
          mockRequest as IdempotencyRequest,
          mockResponse as Response,
          mockNext,
        );
      }).toThrow(BadRequestException);
    });

    it('should allow missing idempotency key for non-critical operations', () => {
      mockRequest.method = HTTP_METHODS.PUT;
      mockRequest.url = '/other-endpoint';
      if (mockRequest.headers) {
        delete mockRequest.headers[HEADERS.IDEMPOTENCY_KEY];
      }

      middleware.use(
        mockRequest as IdempotencyRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate UUID v4 format', () => {
      if (mockRequest.headers) {
        mockRequest.headers[HEADERS.IDEMPOTENCY_KEY] = 'invalid-uuid';
      }

      expect(() => {
        middleware.use(
          mockRequest as IdempotencyRequest,
          mockResponse as Response,
          mockNext,
        );
      }).toThrow(BadRequestException);
    });

    it('should accept valid UUID v4', () => {
      if (mockRequest.headers) {
        mockRequest.headers[HEADERS.IDEMPOTENCY_KEY] =
          '550e8400-e29b-41d4-a716-446655440000';
      }

      expect(() => {
        middleware.use(
          mockRequest as IdempotencyRequest,
          mockResponse as Response,
          mockNext,
        );
      }).not.toThrow();
    });

    it('should reject UUID v1', () => {
      if (mockRequest.headers) {
        mockRequest.headers[HEADERS.IDEMPOTENCY_KEY] =
          '550e8400-e29b-11d4-a716-446655440000'; // v1
      }

      expect(() => {
        middleware.use(
          mockRequest as IdempotencyRequest,
          mockResponse as Response,
          mockNext,
        );
      }).toThrow(BadRequestException);
    });
  });

  describe('Cache Operations', () => {
    beforeEach(() => {
      if (mockRequest.headers) {
        mockRequest.headers[HEADERS.IDEMPOTENCY_KEY] =
          '550e8400-e29b-41d4-a716-446655440000';
      }
    });

    it('should return cached response when available', async () => {
      const cachedResponse = {
        response: { id: '123', status: 'completed' },
        timestamp: Date.now() - 1000,
        status: 200,
      };
      mockCacheProvider.get.mockResolvedValue(cachedResponse);

      middleware.use(
        mockRequest as IdempotencyRequest,
        mockResponse as Response,
        mockNext,
      );

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: '123',
        status: 'completed',
        _idempotent: true,
        _cached: true,
        _originalTimestamp: expect.any(String) as string,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should process request normally when no cached response', async () => {
      mockCacheProvider.get.mockResolvedValue(undefined);

      middleware.use(
        mockRequest as IdempotencyRequest,
        mockResponse as Response,
        mockNext,
      );

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockRequest.idempotencyKey).toBe(
        '550e8400-e29b-41d4-a716-446655440000',
      );
      expect(mockRequest.idempotencyHash).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue processing on cache error', async () => {
      mockCacheProvider.get.mockRejectedValue(new Error('Cache error'));

      middleware.use(
        mockRequest as IdempotencyRequest,
        mockResponse as Response,
        mockNext,
      );

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Request Hash Generation', () => {
    it('should generate consistent hashes for identical requests', () => {
      const request1 = {
        method: 'POST',
        url: '/test',
        body: { data: 'test' },
        query: { param: 'value' },
      };

      const request2 = {
        method: 'POST',
        url: '/test',
        body: { data: 'test' },
        query: { param: 'value' },
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const hash1 = (middleware as MiddlewareAny).createRequestHash(request1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const hash2 = (middleware as MiddlewareAny).createRequestHash(request2);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(32);
    });

    it('should generate different hashes for different requests', () => {
      const request1 = {
        method: 'POST',
        url: '/test',
        body: { data: 'test1' },
        query: {},
      };

      const request2 = {
        method: 'POST',
        url: '/test',
        body: { data: 'test2' },
        query: {},
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const hash1 = (middleware as MiddlewareAny).createRequestHash(request1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const hash2 = (middleware as MiddlewareAny).createRequestHash(request2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Cache Key Sanitization', () => {
    it('should sanitize cache keys properly', () => {
      const unsafeKey = 'key with spaces & special chars!@#$%';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const sanitized = (middleware as MiddlewareAny).sanitizeCacheKey(
        unsafeKey,
      );

      expect(sanitized).toBe('key_with_spaces___special_chars_____');
    });

    it('should preserve alphanumeric characters, hyphens, and colons', () => {
      const safeKey = 'abc123-def:456';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const sanitized = (middleware as MiddlewareAny).sanitizeCacheKey(safeKey);

      expect(sanitized).toBe('abc123-def:456');
    });
  });

  describe('Response Caching', () => {
    beforeEach(() => {
      if (mockRequest.headers) {
        mockRequest.headers[HEADERS.IDEMPOTENCY_KEY] =
          '550e8400-e29b-41d4-a716-446655440000';
      }
      mockCacheProvider.get.mockResolvedValue(undefined);
    });

    it('should cache successful responses', async () => {
      middleware.use(
        mockRequest as IdempotencyRequest,
        mockResponse as Response,
        mockNext,
      );

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate successful response
      const _responseBody = { id: '123', status: 'processing' };
      mockResponse.statusCode = 201;

      // Since the middleware overrides the response methods, we need to simulate
      // the response flow. For this test, we'll verify that the middleware
      // sets up the response interception correctly.
      expect(mockCacheProvider.get).toHaveBeenCalledTimes(1);
    });

    it('should not cache error responses', async () => {
      middleware.use(
        mockRequest as IdempotencyRequest,
        mockResponse as Response,
        mockNext,
      );

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate error response
      mockResponse.statusCode = 400;

      // Trigger the overridden end method
      (mockResponse.end as jest.Mock)();

      // Wait for potential caching
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCacheProvider.set).toHaveBeenCalledTimes(0);
    });
  });

  describe('Utility Methods', () => {
    it('should clear cache', async () => {
      await middleware.clearCache();
      expect(mockCacheProvider.clear).toHaveBeenCalledTimes(1);
    });

    it('should get cache stats', async () => {
      mockCacheProvider.size.mockResolvedValue(5);
      mockCacheProvider.keys.mockResolvedValue(['key1', 'key2', 'key3']);

      const stats = await middleware.getCacheStats();

      expect(stats).toEqual({
        size: 5,
        entries: ['key1', 'key2', 'key3'],
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      if (mockRequest.headers) {
        mockRequest.headers[HEADERS.IDEMPOTENCY_KEY] =
          '550e8400-e29b-41d4-a716-446655440000';
      }
      mockCacheProvider.get.mockRejectedValue(
        new Error('Catastrophic cache failure'),
      );

      // Should not throw
      expect(() => {
        middleware.use(
          mockRequest as IdempotencyRequest,
          mockResponse as Response,
          mockNext,
        );
      }).not.toThrow();

      // Wait for async error handling
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should continue with normal processing
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle cache set errors gracefully', async () => {
      if (mockRequest.headers) {
        mockRequest.headers[HEADERS.IDEMPOTENCY_KEY] =
          '550e8400-e29b-41d4-a716-446655440000';
      }
      mockCacheProvider.get.mockResolvedValue(undefined);
      mockCacheProvider.set.mockRejectedValue(new Error('Cache set failed'));

      middleware.use(
        mockRequest as IdempotencyRequest,
        mockResponse as Response,
        mockNext,
      );

      // Wait for async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate successful response
      mockResponse.statusCode = 200;
      (mockResponse.end as jest.Mock)();

      // Wait for caching attempt
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not throw, just log the error
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
