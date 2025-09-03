/**
 * Security-related constants
 */
export const SECURITY_CONSTANTS = {
  // Rate limiting
  RATE_LIMIT: {
    DEFAULT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    DEFAULT_MAX_REQUESTS: 100,
    CSP_REPORT_WINDOW_MS: 60 * 1000, // 1 minute
    CSP_REPORT_MAX_REQUESTS: 10,
  },

  // Headers
  HEADERS: {
    CONTENT_SECURITY_POLICY: 'Content-Security-Policy',
    CONTENT_SECURITY_POLICY_REPORT_ONLY: 'Content-Security-Policy-Report-Only',
    STRICT_TRANSPORT_SECURITY: 'Strict-Transport-Security',
    X_CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
    X_FRAME_OPTIONS: 'X-Frame-Options',
    X_XSS_PROTECTION: 'X-XSS-Protection',
    REFERRER_POLICY: 'Referrer-Policy',
    X_PERMITTED_CROSS_DOMAIN_POLICIES: 'X-Permitted-Cross-Domain-Policies',
    X_DOWNLOAD_OPTIONS: 'X-Download-Options',
    X_DNS_PREFETCH_CONTROL: 'X-DNS-Prefetch-Control',
    CONTENT_SECURITY_POLICY_NONCE: 'Content-Security-Policy-Nonce',
  },

  // CSP Directives
  CSP: {
    DIRECTIVES: {
      DEFAULT_SRC: 'default-src',
      SCRIPT_SRC: 'script-src',
      STYLE_SRC: 'style-src',
      FONT_SRC: 'font-src',
      IMG_SRC: 'img-src',
      CONNECT_SRC: 'connect-src',
      MEDIA_SRC: 'media-src',
      OBJECT_SRC: 'object-src',
      FRAME_SRC: 'frame-src',
      BASE_URI: 'base-uri',
      FORM_ACTION: 'form-action',
      FRAME_ANCESTORS: 'frame-ancestors',
      UPGRADE_INSECURE_REQUESTS: 'upgrade-insecure-requests',
      REPORT_URI: 'report-uri',
    },
    VALUES: {
      SELF: "'self'",
      NONE: "'none'",
      UNSAFE_INLINE: "'unsafe-inline'",
      UNSAFE_EVAL: "'unsafe-eval'",
      DATA: 'data:',
      HTTPS: 'https:',
    },
  },

  // CORS
  CORS: {
    METHODS: ['GET', 'POST', 'OPTIONS'],
    ALLOWED_HEADERS: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    EXPOSED_HEADERS: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    MAX_AGE_PROD: 86400, // 24 hours
    MAX_AGE_DEV: 300, // 5 minutes
  },

  // Trusted domains
  TRUSTED_DOMAINS: {
    CDN: ['https://cdn.jsdelivr.net', 'https://unpkg.com'],
    FONTS: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
    AWS: ['https://*.amazonaws.com', 'https://*.s3.amazonaws.com'],
  },

  // Development domains
  DEV_DOMAINS: {
    LOCALHOST: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
    ] as readonly string[],
    LOCALSTACK: [
      'http://localhost:*',
      'ws://localhost:*',
      'http://127.0.0.1:*',
      'http://localstack:*',
    ] as readonly string[],
  },

  // Security policies
  POLICIES: {
    CROSS_ORIGIN_EMBEDDER_POLICY: {
      REQUIRE_CORP: 'require-corp',
      UNSAFE_NONE: 'unsafe-none',
    },
    CROSS_ORIGIN_OPENER_POLICY: {
      SAME_ORIGIN: 'same-origin',
      SAME_ORIGIN_ALLOW_POPUPS: 'same-origin-allow-popups',
      UNSAFE_NONE: 'unsafe-none',
    },
    CROSS_ORIGIN_RESOURCE_POLICY: {
      SAME_ORIGIN: 'same-origin',
      SAME_SITE: 'same-site',
      CROSS_ORIGIN: 'cross-origin',
    },
    REFERRER_POLICY: {
      STRICT_ORIGIN_WHEN_CROSS_ORIGIN: 'strict-origin-when-cross-origin',
      SAME_ORIGIN: 'same-origin',
      NO_REFERRER: 'no-referrer',
    },
  },

  // Timeouts and limits
  TIMEOUTS: {
    HSTS_MAX_AGE_PROD: 31536000, // 1 year
    HSTS_MAX_AGE_DEV: 3600, // 1 hour
    EXPECT_CT_MAX_AGE: 86400, // 24 hours
  },

  // Report endpoints
  REPORT_ENDPOINTS: {
    CSP_REPORT: '/api/csp-report',
    CT_REPORT: '/api/ct-report',
  },
} as const;

/**
 * Environment-specific security configurations
 */
export const ENVIRONMENT_SECURITY = {
  development: {
    cspReportOnly: true,
    allowUnsafeInline: true,
    hstsMaxAge: SECURITY_CONSTANTS.TIMEOUTS.HSTS_MAX_AGE_DEV,
    corsMaxAge: SECURITY_CONSTANTS.CORS.MAX_AGE_DEV,
    expectCtEnforce: false,
  },
  staging: {
    cspReportOnly: true,
    allowUnsafeInline: false,
    hstsMaxAge: SECURITY_CONSTANTS.TIMEOUTS.HSTS_MAX_AGE_PROD,
    corsMaxAge: SECURITY_CONSTANTS.CORS.MAX_AGE_PROD,
    expectCtEnforce: false,
  },
  production: {
    cspReportOnly: false,
    allowUnsafeInline: false,
    hstsMaxAge: SECURITY_CONSTANTS.TIMEOUTS.HSTS_MAX_AGE_PROD,
    corsMaxAge: SECURITY_CONSTANTS.CORS.MAX_AGE_PROD,
    expectCtEnforce: true,
  },
} as const;

/**
 * Type for environment names
 */
export type EnvironmentName = keyof typeof ENVIRONMENT_SECURITY;
