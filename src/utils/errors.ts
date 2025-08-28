// Result type for better error handling
export type Result<T, E = NormalizedError> =
  | { success: true; data: T }
  | { success: false; error: E };

// Error normalization
export interface NormalizedError {
  readonly name: string;
  readonly message: string;
  readonly cause?: unknown;
  readonly stack?: string | undefined;
}

export function normalizeError(e: unknown): NormalizedError {
  if (e instanceof Error) {
    return {
      name: e.name,
      message: e.message,
      stack: e.stack ?? undefined,
      cause: e.cause,
    };
  }
  return {
    name: 'UnknownError',
    message: String(e),
  };
}

// Helper functions for Result type
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// Async wrapper that returns Result
export async function tryAsync<T>(
  fn: () => Promise<T>,
): Promise<Result<T, NormalizedError>> {
  try {
    const result = await fn();
    return success(result);
  } catch (error) {
    return failure(normalizeError(error));
  }
}
