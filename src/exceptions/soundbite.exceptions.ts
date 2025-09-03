import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for SoundBite-specific exceptions
 */
export abstract class SoundbiteException extends HttpException {
  abstract readonly code: string;
  abstract readonly type: string;

  constructor(
    message: string,
    status: HttpStatus,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message, status);
  }
}

/**
 * Exception thrown when a soundbite is not found
 */
export class SoundbiteNotFoundException extends SoundbiteException {
  readonly code = 'SOUNDBITE_NOT_FOUND';
  readonly type = 'https://soundbite.example.com/problems/soundbite-not-found';

  constructor(id: string, details?: Record<string, unknown>) {
    super(`Soundbite with ID '${id}' was not found`, HttpStatus.NOT_FOUND, {
      soundbiteId: id,
      ...details,
    });
  }
}

/**
 * Exception thrown when text validation fails
 */
export class InvalidTextException extends SoundbiteException {
  readonly code = 'INVALID_TEXT';
  readonly type = 'https://soundbite.example.com/problems/invalid-text';

  constructor(
    reason: string,
    text?: string,
    details?: Record<string, unknown>,
  ) {
    super(`Invalid text input: ${reason}`, HttpStatus.BAD_REQUEST, {
      reason,
      textLength: text?.length,
      maxLength: 3000, // AWS Polly limit
      ...details,
    });
  }
}

/**
 * Exception thrown when voice ID is invalid
 */
export class InvalidVoiceException extends SoundbiteException {
  readonly code = 'INVALID_VOICE';
  readonly type = 'https://soundbite.example.com/problems/invalid-voice';

  constructor(
    voiceId: string,
    availableVoices?: string[],
    details?: Record<string, unknown>,
  ) {
    super(
      `Invalid voice ID '${voiceId}'. Please use a supported voice.`,
      HttpStatus.BAD_REQUEST,
      {
        providedVoice: voiceId,
        availableVoices: availableVoices ?? [
          'Joanna',
          'Matthew',
          'Ivy',
          'Justin',
          'Kendra',
          'Kimberly',
          'Salli',
          'Joey',
        ],
        ...details,
      },
    );
  }
}

/**
 * Exception thrown when AWS service operations fail
 */
export class AwsServiceException extends SoundbiteException {
  readonly code = 'AWS_SERVICE_ERROR';
  readonly type = 'https://soundbite.example.com/problems/aws-service-error';

  constructor(
    service: string,
    operation: string,
    awsError: Error,
    details?: Record<string, unknown>,
  ) {
    super(
      `AWS ${service} operation '${operation}' failed: ${awsError.message}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      {
        service,
        operation,
        awsErrorName: awsError.name,
        awsErrorMessage: awsError.message,
        ...details,
      },
    );
  }
}

/**
 * Exception thrown when processing fails
 */
export class ProcessingException extends SoundbiteException {
  readonly code = 'PROCESSING_ERROR';
  readonly type = 'https://soundbite.example.com/problems/processing-error';

  constructor(
    stage: string,
    reason: string,
    soundbiteId?: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Processing failed at stage '${stage}': ${reason}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      {
        stage,
        reason,
        soundbiteId,
        ...details,
      },
    );
  }
}

/**
 * Exception thrown when rate limits are exceeded
 */
export class RateLimitExceededException extends SoundbiteException {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly type = 'https://soundbite.example.com/problems/rate-limit-exceeded';

  constructor(
    limit: number,
    windowMs: number,
    retryAfter?: number,
    details?: Record<string, unknown>,
  ) {
    super(
      `Rate limit exceeded. Maximum ${limit} requests per ${windowMs / 1000} seconds.`,
      HttpStatus.TOO_MANY_REQUESTS,
      {
        limit,
        windowSeconds: windowMs / 1000,
        retryAfterSeconds: retryAfter,
        ...details,
      },
    );
  }
}

/**
 * Exception thrown when idempotency key conflicts occur
 */
export class IdempotencyConflictException extends SoundbiteException {
  readonly code = 'IDEMPOTENCY_CONFLICT';
  readonly type = 'https://soundbite.example.com/problems/idempotency-conflict';

  constructor(
    idempotencyKey: string,
    reason: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Idempotency conflict for key '${idempotencyKey}': ${reason}`,
      HttpStatus.CONFLICT,
      {
        idempotencyKey,
        reason,
        ...details,
      },
    );
  }
}

/**
 * Exception thrown when configuration is invalid
 */
export class ConfigurationException extends SoundbiteException {
  readonly code = 'CONFIGURATION_ERROR';
  readonly type = 'https://soundbite.example.com/problems/configuration-error';

  constructor(
    configKey: string,
    reason: string,
    details?: Record<string, unknown>,
  ) {
    super(
      `Configuration error for '${configKey}': ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      {
        configKey,
        reason,
        ...details,
      },
    );
  }
}

/**
 * Exception thrown when external dependencies are unavailable
 */
export class DependencyUnavailableException extends SoundbiteException {
  readonly code = 'DEPENDENCY_UNAVAILABLE';
  readonly type =
    'https://soundbite.example.com/problems/dependency-unavailable';

  constructor(
    dependency: string,
    reason: string,
    retryAfter?: number,
    details?: Record<string, unknown>,
  ) {
    super(
      `Dependency '${dependency}' is unavailable: ${reason}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      {
        dependency,
        reason,
        retryAfterSeconds: retryAfter,
        ...details,
      },
    );
  }
}
