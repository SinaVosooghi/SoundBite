import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSoundbiteResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the soundbite',
    example: 'd09347d0-fbbe-48d2-be59-d12a77ff10fe',
  })
  id: string;

  @ApiProperty({
    description: 'Text that was converted to speech',
    example: 'Hello, this is a test soundbite!',
  })
  text: string;

  @ApiProperty({
    description: 'AWS Polly voice ID used for synthesis',
    example: 'Joanna',
  })
  voiceId: string;

  @ApiProperty({
    description: 'Current status of the soundbite',
    example: 'pending',
    enum: ['pending', 'processing', 'ready', 'failed'],
  })
  status: 'pending' | 'processing' | 'ready' | 'failed';

  @ApiProperty({
    description: 'Timestamp when the soundbite was created',
    example: '2025-07-24T21:57:37.662Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when the soundbite was last updated',
    example: '2025-07-24T21:57:37.662Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Environment where the soundbite was created',
    example: 'development',
  })
  environment: string;
}

export class GetSoundbiteResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the soundbite',
    example: 'd09347d0-fbbe-48d2-be59-d12a77ff10fe',
  })
  id: string;

  @ApiProperty({
    description: 'Text that was converted to speech',
    example: 'Hello, this is a test soundbite!',
  })
  text: string;

  @ApiProperty({
    description: 'AWS Polly voice ID used for synthesis',
    example: 'Joanna',
  })
  voiceId: string;

  @ApiPropertyOptional({
    description: 'S3 key where the audio file is stored',
    example: 'soundbites/d09347d0-fbbe-48d2-be59-d12a77ff10fe.mp3',
  })
  s3Key?: string;

  @ApiPropertyOptional({
    description: 'Public URL to access the audio file',
    example:
      'https://bucket.s3.amazonaws.com/soundbites/d09347d0-fbbe-48d2-be59-d12a77ff10fe.mp3',
  })
  url?: string;

  @ApiProperty({
    description: 'Current status of the soundbite',
    example: 'ready',
    enum: ['pending', 'processing', 'ready', 'failed'],
  })
  status: 'pending' | 'processing' | 'ready' | 'failed';

  @ApiProperty({
    description: 'Timestamp when the soundbite was created',
    example: '2025-07-24T21:57:37.662Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when the soundbite was last updated',
    example: '2025-07-24T21:57:37.662Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Environment where the soundbite was created',
    example: 'development',
  })
  environment: string;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Error message',
    example:
      'Invalid voice ID. Must be one of: Joanna, Matthew, Salli, Kimberly, Kendra, Justin, Kevin, Ruth, Stephen, Ivy',
  })
  message: string;

  @ApiProperty({
    description: 'Error type',
    example: 'Bad Request',
  })
  error: string;
}
