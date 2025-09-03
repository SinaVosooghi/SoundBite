import { Injectable } from '@nestjs/common';
import { ValidationService } from '../services/validation.service';

/**
 * Validator for soundbite input data
 * @deprecated Use ValidationService directly instead
 * This class is kept for backward compatibility
 */
@Injectable()
export class SoundbiteValidator {
  constructor(private readonly validationService: ValidationService) {}

  /**
   * Validates text input for soundbite creation
   * @param text The text to validate
   * @throws InvalidTextException if validation fails
   * @deprecated Use ValidationService.validateText() instead
   */
  validateText(text: string): void {
    this.validationService.validateText(text);
  }

  /**
   * Validates voice ID input
   * @param voiceId The voice ID to validate (optional)
   * @throws InvalidVoiceException if validation fails
   * @deprecated Use ValidationService.validateVoiceId() instead
   */
  validateVoiceId(voiceId?: string): void {
    this.validationService.validateVoiceId(voiceId);
  }

  /**
   * Validates all soundbite input data
   * @param text The text to validate
   * @param voiceId The voice ID to validate (optional)
   * @deprecated Use ValidationService.validateSoundbiteInput() instead
   */
  validateSoundbiteInput(text: string, voiceId?: string): void {
    this.validationService.validateSoundbiteInput(text, voiceId);
  }

  /**
   * Gets the list of supported voices
   * @returns Array of supported voice IDs
   * @deprecated Use ValidationService.getSupportedVoices() instead
   */
  getSupportedVoices(): readonly string[] {
    return this.validationService.getSupportedVoices();
  }

  /**
   * Gets the maximum allowed text length
   * @returns Maximum text length
   * @deprecated Use ValidationService.getMaxTextLength() instead
   */
  getMaxTextLength(): number {
    return this.validationService.getMaxTextLength();
  }
}
