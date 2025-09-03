import { Injectable, Logger } from '@nestjs/common';
import {
  InvalidTextException,
  InvalidVoiceException,
} from '../exceptions/soundbite.exceptions';
import {
  SOUNDBITE_CONSTANTS,
  SUPPORTED_VOICES,
  SupportedVoiceId,
} from '../constants/soundbite';

/**
 * Service for validating soundbite input data
 * Extracted from SoundbiteValidator to separate concerns
 */
@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  /**
   * Validates text input for soundbite creation
   * @param text The text to validate
   * @throws InvalidTextException if validation fails
   */
  validateText(text: string): void {
    if (!text || typeof text !== 'string') {
      throw new InvalidTextException('Text is required and must be a string');
    }

    if (text.trim().length === 0) {
      throw new InvalidTextException(
        'Text cannot be empty or only whitespace',
        text,
      );
    }

    if (text.length > SOUNDBITE_CONSTANTS.MAX_TEXT_LENGTH) {
      throw new InvalidTextException(
        `Text exceeds maximum length of ${SOUNDBITE_CONSTANTS.MAX_TEXT_LENGTH} characters`,
        text,
        {
          actualLength: text.length,
          maxLength: SOUNDBITE_CONSTANTS.MAX_TEXT_LENGTH,
        },
      );
    }

    // Check for potentially problematic characters
    if (SOUNDBITE_CONSTANTS.VALIDATION.PROBLEMATIC_CHARS_REGEX.test(text)) {
      throw new InvalidTextException(
        'Text contains unsupported characters',
        text,
        {
          unsupportedChars: text.match(
            SOUNDBITE_CONSTANTS.VALIDATION.PROBLEMATIC_CHARS_REGEX,
          ),
        },
      );
    }

    this.logger.debug(`Text validation passed for ${text.length} characters`);
  }

  /**
   * Validates voice ID input
   * @param voiceId The voice ID to validate (optional)
   * @throws InvalidVoiceException if validation fails
   */
  validateVoiceId(voiceId?: string): void {
    if (voiceId === undefined || voiceId === null || voiceId.length === 0) {
      return; // Optional parameter, will default to 'Joanna'
    }

    if (!SUPPORTED_VOICES.includes(voiceId as SupportedVoiceId)) {
      throw new InvalidVoiceException(voiceId, [...SUPPORTED_VOICES]);
    }

    this.logger.debug(`Voice ID validation passed for: ${voiceId}`);
  }

  /**
   * Validates all soundbite input data
   * @param text The text to validate
   * @param voiceId The voice ID to validate (optional)
   */
  validateSoundbiteInput(text: string, voiceId?: string): void {
    this.validateText(text);
    this.validateVoiceId(voiceId);

    this.logger.debug('Complete soundbite input validation passed');
  }

  /**
   * Validates user ID format (if provided)
   * @param userId The user ID to validate (optional)
   */
  validateUserId(userId?: string): void {
    if (userId === undefined || userId === null || userId.length === 0) {
      return; // Optional parameter, will default to 'anonymous'
    }

    // Basic validation - ensure it's a string and not too long
    if (typeof userId !== 'string') {
      throw new Error('User ID must be a string');
    }

    if (userId.length > 255) {
      throw new Error('User ID cannot exceed 255 characters');
    }

    // Check for potentially problematic characters in user ID
    const userIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!userIdRegex.test(userId)) {
      throw new Error(
        'User ID contains invalid characters. Only alphanumeric characters, underscores, and hyphens are allowed',
      );
    }

    this.logger.debug(`User ID validation passed for: ${userId}`);
  }

  /**
   * Validates idempotency key format (if provided)
   * @param idempotencyKey The idempotency key to validate (optional)
   */
  validateIdempotencyKey(idempotencyKey?: string): void {
    if (
      idempotencyKey === undefined ||
      idempotencyKey === null ||
      idempotencyKey.length === 0
    ) {
      return; // Optional parameter
    }

    if (typeof idempotencyKey !== 'string') {
      throw new Error('Idempotency key must be a string');
    }

    if (idempotencyKey.length < 1 || idempotencyKey.length > 255) {
      throw new Error('Idempotency key must be between 1 and 255 characters');
    }

    // Basic format validation - should be alphanumeric with some special chars
    const idempotencyKeyRegex = /^[a-zA-Z0-9_-]+$/;
    if (!idempotencyKeyRegex.test(idempotencyKey)) {
      throw new Error(
        'Idempotency key contains invalid characters. Only alphanumeric characters, underscores, and hyphens are allowed',
      );
    }

    this.logger.debug(
      `Idempotency key validation passed for: ${idempotencyKey.substring(0, 8)}...`,
    );
  }

  /**
   * Validates complete soundbite creation request
   * @param text The text to validate
   * @param voiceId The voice ID to validate (optional)
   * @param userId The user ID to validate (optional)
   * @param idempotencyKey The idempotency key to validate (optional)
   */
  validateCreateSoundbiteRequest(
    text: string,
    voiceId?: string,
    userId?: string,
    idempotencyKey?: string,
  ): void {
    this.validateText(text);
    this.validateVoiceId(voiceId);
    this.validateUserId(userId);
    this.validateIdempotencyKey(idempotencyKey);

    this.logger.debug('Complete soundbite creation request validation passed');
  }

  /**
   * Gets the list of supported voices
   * @returns Array of supported voice IDs
   */
  getSupportedVoices(): readonly string[] {
    return SUPPORTED_VOICES;
  }

  /**
   * Gets the maximum allowed text length
   * @returns Maximum text length
   */
  getMaxTextLength(): number {
    return SOUNDBITE_CONSTANTS.MAX_TEXT_LENGTH;
  }

  /**
   * Gets the default voice ID
   * @returns Default voice ID
   */
  getDefaultVoiceId(): string {
    return SOUNDBITE_CONSTANTS.DEFAULT_VOICE_ID;
  }
}
