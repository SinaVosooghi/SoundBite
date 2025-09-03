/**
 * Soundbite-related constants
 */
export const SOUNDBITE_CONSTANTS = {
  // Text validation
  MAX_TEXT_LENGTH: 3000,

  // Voice IDs
  DEFAULT_VOICE_ID: 'Joanna',

  // Status values
  STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    READY: 'ready',
    FAILED: 'failed',
  } as const,

  // DynamoDB keys
  DYNAMODB: {
    PK_PREFIX: '',
    SK_PREFIX: 'SOUNDBITE#',
  } as const,

  // SQS Message attributes
  SQS: {
    ENVIRONMENT_ATTRIBUTE: 'Environment',
  } as const,

  // Default values
  DEFAULTS: {
    USER_ID: 'anonymous',
    TTL_HOURS: 24,
    TTL_MS: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  } as const,

  // Validation patterns
  VALIDATION: {
    PROBLEMATIC_CHARS_REGEX: /[<>{}[\]\\]/g,
  } as const,
} as const;

/**
 * Supported AWS Polly voices
 */
export const SUPPORTED_VOICES = [
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

/**
 * Type for supported voice IDs
 */
export type SupportedVoiceId = (typeof SUPPORTED_VOICES)[number];

/**
 * Type for soundbite status
 */
export type SoundbiteStatus =
  (typeof SOUNDBITE_CONSTANTS.STATUS)[keyof typeof SOUNDBITE_CONSTANTS.STATUS];
