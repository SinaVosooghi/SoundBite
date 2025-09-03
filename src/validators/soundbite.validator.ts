import { Injectable } from '@nestjs/common';
import {
  InvalidTextException,
  InvalidVoiceException,
} from '../exceptions/soundbite.exceptions';

/**
 * Validator for soundbite input data
 */
@Injectable()
export class SoundbiteValidator {
  private static readonly MAX_TEXT_LENGTH = 3000;
  private static readonly SUPPORTED_VOICES = [
    'Joanna',
    'Matthew',
    'Ivy',
    'Justin',
    'Kendra',
    'Kimberly',
    'Salli',
    'Joey',
    'Amy',
    'Brian',
    'Emma',
    'Russell',
    'Nicole',
    'Olivia',
    'Raveena',
    'Aditi',
    'Geraint',
    'Gwyneth',
    'Celine',
    'Chantal',
    'Mathieu',
    'Lea',
    'Hans',
    'Marlene',
    'Vicki',
    'Conchita',
    'Enrique',
    'Lucia',
    'Mia',
    'Bianca',
    'Carla',
    'Giorgio',
    'Mizuki',
    'Takumi',
    'Seoyeon',
    'Liv',
    'Lotte',
    'Ruben',
    'Ewa',
    'Jacek',
    'Jan',
    'Maja',
    'Ricardo',
    'Vitoria',
    'Cristiano',
    'Ines',
    'Carmen',
    'Maxim',
    'Tatyana',
    'Astrid',
    'Filiz',
    'Zhiyu',
  ] as const;

  private static readonly PROBLEMATIC_CHARS_REGEX = /[<>{}[\]\\]/g;

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

    if (text.length > SoundbiteValidator.MAX_TEXT_LENGTH) {
      throw new InvalidTextException(
        `Text exceeds maximum length of ${SoundbiteValidator.MAX_TEXT_LENGTH} characters`,
        text,
        {
          actualLength: text.length,
          maxLength: SoundbiteValidator.MAX_TEXT_LENGTH,
        },
      );
    }

    // Check for potentially problematic characters
    if (SoundbiteValidator.PROBLEMATIC_CHARS_REGEX.test(text)) {
      throw new InvalidTextException(
        'Text contains unsupported characters',
        text,
        {
          unsupportedChars: text.match(
            SoundbiteValidator.PROBLEMATIC_CHARS_REGEX,
          ),
        },
      );
    }
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

    if (
      !SoundbiteValidator.SUPPORTED_VOICES.includes(
        voiceId as (typeof SoundbiteValidator.SUPPORTED_VOICES)[number],
      )
    ) {
      throw new InvalidVoiceException(voiceId, [
        ...SoundbiteValidator.SUPPORTED_VOICES,
      ]);
    }
  }

  /**
   * Validates all soundbite input data
   * @param text The text to validate
   * @param voiceId The voice ID to validate (optional)
   */
  validateSoundbiteInput(text: string, voiceId?: string): void {
    this.validateText(text);
    this.validateVoiceId(voiceId);
  }

  /**
   * Gets the list of supported voices
   * @returns Array of supported voice IDs
   */
  getSupportedVoices(): readonly string[] {
    return SoundbiteValidator.SUPPORTED_VOICES;
  }

  /**
   * Gets the maximum allowed text length
   * @returns Maximum text length
   */
  getMaxTextLength(): number {
    return SoundbiteValidator.MAX_TEXT_LENGTH;
  }
}
