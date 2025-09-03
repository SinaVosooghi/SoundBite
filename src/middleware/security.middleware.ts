import type { NestMiddleware } from '@nestjs/common';
import { Injectable as _Injectable } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import type { RateLimitRequestHandler } from 'express-rate-limit';
import rateLimit from 'express-rate-limit';
import type { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

export interface SecurityRequest extends Request {
  nonce?: string;
}

@_Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private rateLimiter: RateLimitRequestHandler;

  constructor(private configService: ConfigService) {
    // Configure rate limiting
    this.rateLimiter = rateLimit({
      windowMs:
        this.configService.get('production.security.rateLimitTtl') * 1000, // Convert to milliseconds
      max: this.configService.get('production.security.rateLimitLimit'),
      message: {
        error: 'Too many requests from this IP, please try again later.',
        statusCode: 429,
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  use(req: SecurityRequest, res: Response, next: NextFunction): void {
    // Generate nonce for CSP
    const nonce = randomBytes(16).toString('base64');
    req.nonce = nonce;

    // Enhanced helmet configuration with nonce-based CSP
    const helmetConfig = this.getHelmetConfig(nonce);

    helmet(helmetConfig)(req, res, () => {
      // Apply rate limiting
      this.rateLimiter(req, res, next);
    });
  }

  private getHelmetConfig(nonce: string): Record<string, unknown> {
    const environment =
      this.configService.get<string>('NODE_ENV') ?? 'development';
    const isDevelopment = environment === 'development';
    const isProduction = environment === 'production';

    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            `'nonce-${nonce}'`,
            // Allow inline scripts only in development
            ...(isDevelopment ? ["'unsafe-inline'"] : []),
            // Trusted CDNs for production
            ...(isProduction
              ? ['https://cdn.jsdelivr.net', 'https://unpkg.com']
              : []),
          ],
          styleSrc: [
            "'self'",
            `'nonce-${nonce}'`,
            // Use specific hashes instead of unsafe-inline when possible
            "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='", // Empty inline style hash
            // Only allow unsafe-inline in development
            ...(isDevelopment ? ["'unsafe-inline'"] : []),
            // Trusted style CDNs
            'https://fonts.googleapis.com',
            'https://cdn.jsdelivr.net',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            // API endpoints
            ...(isDevelopment
              ? [
                  'http://localhost:*',
                  'ws://localhost:*',
                  'http://127.0.0.1:*',
                  // LocalStack endpoints
                  'http://localstack:*',
                ]
              : [
                  // Production API endpoints
                  'https://api.soundbite.example.com',
                  // AWS services
                  'https://*.amazonaws.com',
                ]),
          ],
          mediaSrc: [
            "'self'",
            // S3 bucket for audio files
            'https://*.amazonaws.com',
            'https://*.s3.amazonaws.com',
          ],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: isProduction ? [] : null,
          // Report violations in production
          ...(isProduction && {
            reportUri: ['/api/csp-report'],
          }),
        },
        reportOnly: isDevelopment,
      },
      crossOriginEmbedderPolicy: isProduction
        ? {
            policy: 'require-corp' as const,
          }
        : {
            policy: 'unsafe-none' as const,
          },
      crossOriginOpenerPolicy: {
        policy: 'same-origin' as const,
      },
      crossOriginResourcePolicy: isProduction
        ? {
            policy: 'same-origin' as const,
          }
        : {
            policy: 'cross-origin' as const,
          },
      dnsPrefetchControl: {
        allow: false,
      },
      expectCt: {
        maxAge: 86400,
        enforce: isProduction,
        // Report violations
        ...(isProduction && {
          reportUri: '/api/ct-report',
        }),
      },
      hsts: {
        maxAge: isProduction ? 31536000 : 3600, // 1 year in prod, 1 hour in dev
        includeSubDomains: isProduction,
        preload: isProduction,
      },
      noSniff: true,
      frameguard: { action: 'deny' as const },
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' as const },
      permittedCrossDomainPolicies: false,
      // Hide X-Powered-By header
      hidePoweredBy: true,
    };
  }
}

// Enhanced CORS configuration
export const getCorsOptions = (
  environment: string,
): Record<string, unknown> => {
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (origin === undefined || origin === null || origin.length === 0) {
        return callback(null, true);
      }

      const allowedOrigins = isDevelopment
        ? [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:8080',
            'http://127.0.0.1:3000',
          ]
        : (process.env.CORS_ORIGIN ?? '').split(',').filter(Boolean);

      if (allowedOrigins.includes(origin) || isDevelopment) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    credentials: true,
    maxAge: isProduction ? 86400 : 300, // 24 hours in prod, 5 minutes in dev
    optionsSuccessStatus: 200,
  };
};

// Security headers factory
export const getSecurityHeaders = (nonce?: string): Record<string, string> => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'X-Download-Options': 'noopen',
  'X-DNS-Prefetch-Control': 'off',
  ...(nonce !== undefined &&
    nonce !== null &&
    nonce.length > 0 && {
      'Content-Security-Policy-Nonce': nonce,
    }),
});
