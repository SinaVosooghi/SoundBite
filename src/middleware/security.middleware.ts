import type { NestMiddleware } from '@nestjs/common';
import { Injectable as _Injectable } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import type { RateLimitRequestHandler } from 'express-rate-limit';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'crypto';
import {
  SECURITY_CONSTANTS,
  ENVIRONMENT_SECURITY,
  EnvironmentName,
} from '../constants/security';

export interface SecurityRequest extends Request {
  nonce?: string;
}

@_Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private rateLimiter: RateLimitRequestHandler;

  constructor() {
    // Configure rate limiting using environment variables
    this.rateLimiter = rateLimit({
      windowMs: parseInt(
        process.env.RATE_LIMIT_TTL ??
          SECURITY_CONSTANTS.RATE_LIMIT.DEFAULT_WINDOW_MS.toString(),
      ),
      max: parseInt(
        process.env.RATE_LIMIT_MAX ??
          SECURITY_CONSTANTS.RATE_LIMIT.DEFAULT_MAX_REQUESTS.toString(),
      ),
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
    const environment = (process.env.NODE_ENV ??
      'development') as EnvironmentName;
    const envConfig =
      ENVIRONMENT_SECURITY[environment] ?? ENVIRONMENT_SECURITY.development;
    const isDevelopment = environment === 'development';
    const isProduction = environment === 'production';

    return {
      contentSecurityPolicy: {
        directives: {
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.DEFAULT_SRC]: [
            SECURITY_CONSTANTS.CSP.VALUES.SELF,
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.SCRIPT_SRC]: [
            SECURITY_CONSTANTS.CSP.VALUES.SELF,
            `'nonce-${nonce}'`,
            // Allow inline scripts only in development
            ...(envConfig.allowUnsafeInline
              ? [SECURITY_CONSTANTS.CSP.VALUES.UNSAFE_INLINE]
              : []),
            // Trusted CDNs for production
            ...(isProduction ? SECURITY_CONSTANTS.TRUSTED_DOMAINS.CDN : []),
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.STYLE_SRC]: [
            SECURITY_CONSTANTS.CSP.VALUES.SELF,
            `'nonce-${nonce}'`,
            // Use specific hashes instead of unsafe-inline when possible
            "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='", // Empty inline style hash
            // Only allow unsafe-inline in development
            ...(envConfig.allowUnsafeInline
              ? [SECURITY_CONSTANTS.CSP.VALUES.UNSAFE_INLINE]
              : []),
            // Trusted style CDNs
            ...SECURITY_CONSTANTS.TRUSTED_DOMAINS.FONTS,
            ...SECURITY_CONSTANTS.TRUSTED_DOMAINS.CDN,
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.FONT_SRC]: [
            SECURITY_CONSTANTS.CSP.VALUES.SELF,
            ...SECURITY_CONSTANTS.TRUSTED_DOMAINS.FONTS,
            SECURITY_CONSTANTS.CSP.VALUES.DATA,
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.IMG_SRC]: [
            SECURITY_CONSTANTS.CSP.VALUES.SELF,
            SECURITY_CONSTANTS.CSP.VALUES.DATA,
            SECURITY_CONSTANTS.CSP.VALUES.HTTPS,
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.CONNECT_SRC]: [
            SECURITY_CONSTANTS.CSP.VALUES.SELF,
            // API endpoints
            ...(isDevelopment
              ? SECURITY_CONSTANTS.DEV_DOMAINS.LOCALSTACK
              : [
                  // Production API endpoints
                  'https://api.soundbite.example.com',
                  // AWS services
                  ...SECURITY_CONSTANTS.TRUSTED_DOMAINS.AWS,
                ]),
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.MEDIA_SRC]: [
            SECURITY_CONSTANTS.CSP.VALUES.SELF,
            // S3 bucket for audio files
            ...SECURITY_CONSTANTS.TRUSTED_DOMAINS.AWS,
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.OBJECT_SRC]: [
            SECURITY_CONSTANTS.CSP.VALUES.NONE,
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.FRAME_SRC]: [
            SECURITY_CONSTANTS.CSP.VALUES.NONE,
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.BASE_URI]: [
            SECURITY_CONSTANTS.CSP.VALUES.SELF,
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.FORM_ACTION]: [
            SECURITY_CONSTANTS.CSP.VALUES.SELF,
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.FRAME_ANCESTORS]: [
            SECURITY_CONSTANTS.CSP.VALUES.NONE,
          ],
          [SECURITY_CONSTANTS.CSP.DIRECTIVES.UPGRADE_INSECURE_REQUESTS]:
            isProduction ? [] : null,
          // Report violations in production
          ...(isProduction && {
            [SECURITY_CONSTANTS.CSP.DIRECTIVES.REPORT_URI]: [
              SECURITY_CONSTANTS.REPORT_ENDPOINTS.CSP_REPORT,
            ],
          }),
        },
        reportOnly: envConfig.cspReportOnly,
      },
      crossOriginEmbedderPolicy: isProduction
        ? {
            policy:
              SECURITY_CONSTANTS.POLICIES.CROSS_ORIGIN_EMBEDDER_POLICY
                .REQUIRE_CORP,
          }
        : {
            policy:
              SECURITY_CONSTANTS.POLICIES.CROSS_ORIGIN_EMBEDDER_POLICY
                .UNSAFE_NONE,
          },
      crossOriginOpenerPolicy: {
        policy:
          SECURITY_CONSTANTS.POLICIES.CROSS_ORIGIN_OPENER_POLICY.SAME_ORIGIN,
      },
      crossOriginResourcePolicy: isProduction
        ? {
            policy:
              SECURITY_CONSTANTS.POLICIES.CROSS_ORIGIN_RESOURCE_POLICY
                .SAME_ORIGIN,
          }
        : {
            policy:
              SECURITY_CONSTANTS.POLICIES.CROSS_ORIGIN_RESOURCE_POLICY
                .CROSS_ORIGIN,
          },
      dnsPrefetchControl: {
        allow: false,
      },
      expectCt: {
        maxAge: SECURITY_CONSTANTS.TIMEOUTS.EXPECT_CT_MAX_AGE,
        enforce: envConfig.expectCtEnforce,
        // Report violations
        ...(isProduction && {
          reportUri: SECURITY_CONSTANTS.REPORT_ENDPOINTS.CT_REPORT,
        }),
      },
      hsts: {
        maxAge: envConfig.hstsMaxAge,
        includeSubDomains: isProduction,
        preload: isProduction,
      },
      noSniff: true,
      frameguard: { action: 'deny' as const },
      xssFilter: true,
      referrerPolicy: {
        policy:
          SECURITY_CONSTANTS.POLICIES.REFERRER_POLICY
            .STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
      },
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
        ? SECURITY_CONSTANTS.DEV_DOMAINS.LOCALHOST
        : (process.env.CORS_ORIGIN ?? '').split(',').filter(Boolean);

      if (allowedOrigins.includes(origin) || isDevelopment) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: SECURITY_CONSTANTS.CORS.METHODS,
    allowedHeaders: SECURITY_CONSTANTS.CORS.ALLOWED_HEADERS,
    exposedHeaders: SECURITY_CONSTANTS.CORS.EXPOSED_HEADERS,
    credentials: true,
    maxAge: isProduction
      ? SECURITY_CONSTANTS.CORS.MAX_AGE_PROD
      : SECURITY_CONSTANTS.CORS.MAX_AGE_DEV,
    optionsSuccessStatus: 200,
  };
};

// Security headers factory
export const getSecurityHeaders = (nonce?: string): Record<string, string> => ({
  [SECURITY_CONSTANTS.HEADERS.X_CONTENT_TYPE_OPTIONS]: 'nosniff',
  [SECURITY_CONSTANTS.HEADERS.X_FRAME_OPTIONS]: 'DENY',
  [SECURITY_CONSTANTS.HEADERS.X_XSS_PROTECTION]: '1; mode=block',
  [SECURITY_CONSTANTS.HEADERS.STRICT_TRANSPORT_SECURITY]:
    `max-age=${SECURITY_CONSTANTS.TIMEOUTS.HSTS_MAX_AGE_PROD}; includeSubDomains; preload`,
  [SECURITY_CONSTANTS.HEADERS.REFERRER_POLICY]:
    SECURITY_CONSTANTS.POLICIES.REFERRER_POLICY.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
  [SECURITY_CONSTANTS.HEADERS.X_PERMITTED_CROSS_DOMAIN_POLICIES]: 'none',
  [SECURITY_CONSTANTS.HEADERS.X_DOWNLOAD_OPTIONS]: 'noopen',
  [SECURITY_CONSTANTS.HEADERS.X_DNS_PREFETCH_CONTROL]: 'off',
  ...(nonce !== undefined &&
    nonce !== null &&
    nonce.length > 0 && {
      [SECURITY_CONSTANTS.HEADERS.CONTENT_SECURITY_POLICY_NONCE]: nonce,
    }),
});
