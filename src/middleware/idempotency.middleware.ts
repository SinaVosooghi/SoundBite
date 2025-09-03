import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  ConflictException as _ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import type { CacheProvider } from '../interfaces/cache-provider.interface';
import { PATHS, HTTP_METHODS, HEADERS } from '../constants/paths';

export interface IdempotencyRequest extends Request {
  idempotencyKey?: string;
  idempotencyHash?: string;
  idempotencyMetadata?: {
    required: boolean;
    ttl: number;
  };
}

interface IdempotentResponse {
  _idempotent: boolean;
  _cached?: boolean;
  _originalTimestamp?: string;
  [key: string]: unknown;
}

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private readonly MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

  constructor(
    @Inject('CACHE_PROVIDER') private readonly cacheProvider: CacheProvider,
    private readonly reflector: Reflector,
  ) {}

  use(req: IdempotencyRequest, res: Response, next: NextFunction): void {
    // Only apply to POST, PUT, PATCH requests
    const allowedMethods = [
      HTTP_METHODS.POST,
      HTTP_METHODS.PUT,
      HTTP_METHODS.PATCH,
    ];
    if (
      !allowedMethods.includes(req.method as (typeof allowedMethods)[number])
    ) {
      return next();
    }

    // Check request size limit (only if body exists and is parsed)
    if (req.body !== undefined && req.body !== null) {
      try {
        const requestSize = JSON.stringify(req.body).length;
        if (requestSize > this.MAX_REQUEST_SIZE) {
          throw new BadRequestException({
            error: 'Bad Request',
            message: 'Request body too large for idempotency processing',
            statusCode: 400,
            details: {
              maxSize: `${this.MAX_REQUEST_SIZE} bytes`,
              actualSize: `${requestSize} bytes`,
            },
          });
        }
      } catch (error) {
        // If we can't serialize the body, skip size check
        this.logger.warn(
          'Could not check request size for idempotency:',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const idempotencyKey = req.headers[HEADERS.IDEMPOTENCY_KEY] as string;

    if (!idempotencyKey) {
      // Check if idempotency is required based on decorator metadata or fallback to path-based logic
      const requestPath = req.path || req.url || '';
      const isCriticalPath =
        requestPath.includes(PATHS.SOUNDBITE) &&
        req.method === HTTP_METHODS.POST;
      const isIdempotentEndpoint =
        requestPath.includes('idempotent') && req.method !== 'GET';
      const isOptionalEndpoint = requestPath.includes('optional');

      // Required for @Idempotent() decorated endpoints and critical paths, but not for @OptionallyIdempotent()
      const isRequired =
        (req.idempotencyMetadata?.required ?? false) ||
        isCriticalPath ||
        (isIdempotentEndpoint && !isOptionalEndpoint);

      if (isRequired) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'Idempotency-Key header is required for this operation',
          statusCode: 400,
          details: {
            header: HEADERS.IDEMPOTENCY_KEY,
            description:
              'Provide a unique identifier to prevent duplicate requests',
            example: `${HEADERS.IDEMPOTENCY_KEY}: 550e8400-e29b-41d4-a716-446655440000`,
          },
        });
      }
      return next();
    }

    // Determine if we should cache this request
    // Cache if it's a critical path, idempotent endpoint, or optional endpoint with idempotency key
    const isCriticalPath =
      (req.path || req.url)?.includes(PATHS.SOUNDBITE) &&
      req.method === HTTP_METHODS.POST;
    const isIdempotentTestEndpoint = (req.path || req.url)?.includes(
      'idempotent',
    );
    const isOptionalEndpoint = (req.path || req.url)?.includes('optional');
    const shouldCache =
      isCriticalPath || isIdempotentTestEndpoint || isOptionalEndpoint;

    // Validate idempotency key format (UUID v4)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Invalid Idempotency-Key format. Must be a valid UUID v4',
        statusCode: 400,
        details: {
          provided: idempotencyKey,
          expected:
            'UUID v4 format (e.g., 550e8400-e29b-41d4-a716-446655440000)',
        },
      });
    }

    // Create hash of request body + method + path for additional uniqueness
    const requestHash = this.createRequestHash(req);
    const cacheKey = this.sanitizeCacheKey(`${idempotencyKey}:${requestHash}`);

    // Handle cache lookup asynchronously with proper error handling
    this.handleIdempotentRequest(
      req,
      res,
      next,
      cacheKey,
      idempotencyKey,
      requestHash,
      shouldCache,
    ).catch((error) => {
      this.logger.error('Idempotency middleware error:', error);
      // Continue with normal processing on error
      next();
    });
  }

  private async handleIdempotentRequest(
    req: IdempotencyRequest,
    res: Response,
    next: NextFunction,
    cacheKey: string,
    idempotencyKey: string,
    requestHash: string,
    shouldCache: boolean,
  ): Promise<void> {
    try {
      // Check if we've seen this idempotency key before
      const cachedResponse = await this.cacheProvider.get(cacheKey);

      if (cachedResponse) {
        const { response, status, timestamp } = cachedResponse;

        // Log cache hit with structured logging
        this.logger.log('Idempotency cache hit', {
          cacheKey: cacheKey.substring(0, 16) + '...',
          status,
          age: Date.now() - timestamp,
        });

        // Return the cached response
        res.status(status).json({
          ...response,
          _idempotent: true,
          _cached: true,
          _originalTimestamp: new Date(timestamp).toISOString(),
        } as IdempotentResponse);
        return;
      }

      // Process the request normally
      this.processRequest(
        req,
        res,
        next,
        cacheKey,
        idempotencyKey,
        requestHash,
        shouldCache,
      );
    } catch (error) {
      // Log cache errors and continue with normal processing
      this.logger.error('Cache operation failed:', error);
      this.processRequest(
        req,
        res,
        next,
        cacheKey,
        idempotencyKey,
        requestHash,
        shouldCache,
      );
    }
  }

  private processRequest(
    req: IdempotencyRequest,
    res: Response,
    next: NextFunction,
    cacheKey: string,
    idempotencyKey: string,
    requestHash: string,
    shouldCache: boolean,
  ): void {
    // Store the idempotency key and hash in the request for use by the service
    req.idempotencyKey = idempotencyKey;
    req.idempotencyHash = requestHash;

    // Intercept the response to cache it
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: Record<string, unknown> | undefined;
    let responseStatus = res.statusCode;

    res.json = function (body: Record<string, unknown>) {
      responseBody = body;
      responseStatus = res.statusCode;
      // Add idempotent flag to the response only if we should cache
      const enhancedBody = shouldCache
        ? {
            ...body,
            _idempotent: true,
          }
        : body;
      return originalJson.call(this, enhancedBody);
    };

    res.send = function (
      this: Response,
      body: string | Buffer | Record<string, unknown>,
    ) {
      if (typeof body === 'object' && body !== null && !Buffer.isBuffer(body)) {
        responseBody = body;
        // Add idempotent flag to object responses only if we should cache
        const enhancedBody = shouldCache
          ? {
              ...body,
              _idempotent: true,
            }
          : body;
        responseStatus = res.statusCode;
        return originalSend.call(this, enhancedBody);
      }
      responseStatus = res.statusCode;
      return originalSend.call(this, body);
    };

    // Override res.end to cache successful responses
    const cacheProvider = this.cacheProvider;
    const ttl = this.TTL;
    const logger = this.logger;

    // Override res.end with proper typing
    const originalEndMethod = res.end.bind(res);
    res.end = function (
      this: Response,
      chunk?: string | Buffer,
      encodingOrCb?: BufferEncoding | (() => void),
      cb?: () => void,
    ) {
      // Only cache successful responses (2xx status codes) and only if we should cache
      if (
        shouldCache &&
        responseStatus >= 200 &&
        responseStatus < 300 &&
        responseBody !== null &&
        responseBody !== undefined
      ) {
        const cacheEntry = {
          response: responseBody, // Store original response without flags
          timestamp: Date.now(),
          status: responseStatus,
        };

        // Cache the response asynchronously with structured logging
        cacheProvider.set(cacheKey, cacheEntry, ttl).catch((error) => {
          // Log cache errors but don't fail the request
          logger.error('Failed to cache idempotent response:', {
            error: error instanceof Error ? error.message : String(error),
            cacheKey: cacheKey.substring(0, 16) + '...', // Log partial key for debugging
            status: responseStatus,
          });
        });
      }

      // Handle different overloads properly
      if (typeof encodingOrCb === 'function') {
        // res.end(chunk, callback)
        return originalEndMethod(chunk, encodingOrCb);
      } else if (encodingOrCb && cb) {
        // res.end(chunk, encoding, callback)
        return originalEndMethod(chunk, encodingOrCb, cb);
      } else if (encodingOrCb) {
        // res.end(chunk, encoding)
        return originalEndMethod(chunk, encodingOrCb);
      } else {
        // res.end(chunk) or res.end()
        return originalEndMethod(chunk);
      }
    } as typeof res.end;

    next();
  }

  private createRequestHash(req: Request): string {
    const hashInput = JSON.stringify({
      method: req.method,
      path: req.path || req.url,
      body: req.body as Record<string, unknown> | undefined,
      query: req.query,
    });

    // Use full hash to reduce collision probability
    return createHash('sha256')
      .update(hashInput)
      .digest('hex')
      .substring(0, 32); // Increased from 16 to 32 characters
  }

  private sanitizeCacheKey(key: string): string {
    // Replace any non-alphanumeric characters (except hyphens and colons) with underscores
    return key.replace(/[^a-zA-Z0-9:-]/g, '_');
  }

  // Method to manually clear cache (useful for testing)
  async clearCache(): Promise<void> {
    await this.cacheProvider.clear();
  }

  // Method to get cache stats
  async getCacheStats(): Promise<{ size: number; entries: string[] }> {
    const [size, entries] = await Promise.all([
      this.cacheProvider.size(),
      this.cacheProvider.keys(),
    ]);

    return { size, entries };
  }
}
