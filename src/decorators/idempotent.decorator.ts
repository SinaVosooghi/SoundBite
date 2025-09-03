import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

/**
 * Decorator to mark an endpoint as requiring idempotency
 * @param required - Whether idempotency key is required (default: true)
 * @param ttl - Time to live for cached responses in milliseconds (default: 24 hours)
 */
export const Idempotent = (
  required = true,
  ttl: number = 24 * 60 * 60 * 1000,
): ReturnType<typeof SetMetadata> =>
  SetMetadata(IDEMPOTENT_KEY, { required, ttl });

/**
 * Decorator to mark an endpoint as optionally idempotent
 */
export const OptionallyIdempotent = (): ReturnType<typeof SetMetadata> =>
  Idempotent(false);

/**
 * Decorator to mark an endpoint as requiring idempotency with custom TTL
 */
export const IdempotentWithTTL = (
  ttl: number,
): ReturnType<typeof SetMetadata> => Idempotent(true, ttl);
