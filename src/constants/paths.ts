/**
 * API path constants
 */
export const PATHS = {
  SOUNDBITE: '/soundbite',
  CSP_REPORT: '/api/csp-report',
  CT_REPORT: '/api/ct-report',
  HEALTH: '/health',
  METRICS: '/metrics',
} as const;

/**
 * HTTP methods
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
  OPTIONS: 'OPTIONS',
} as const;

/**
 * Cache keys
 */
export const CACHE_KEYS = {
  IDEMPOTENCY_PREFIX: 'idempotency',
  RATE_LIMIT_PREFIX: 'rate_limit',
} as const;

/**
 * Header names
 */
export const HEADERS = {
  IDEMPOTENCY_KEY: 'idempotency-key',
  CONTENT_TYPE: 'content-type',
  AUTHORIZATION: 'authorization',
  X_REQUESTED_WITH: 'x-requested-with',
} as const;
