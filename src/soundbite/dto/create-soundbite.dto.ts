import { IsString, IsOptional, IsNotEmpty, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSoundbiteDto {
  @ApiProperty({
    description: 'Text to convert to speech',
    example: 'Hello, this is a test soundbite!',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, { message: 'Text must be 1000 characters or less' })
  text: string;

  @ApiPropertyOptional({
    description: 'AWS Polly voice ID',
    example: 'Joanna',
    enum: ['Joanna', 'Matthew', 'Salli', 'Kimberly', 'Kendra', 'Justin', 'Kevin', 'Ruth', 'Stephen', 'Ivy'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['Joanna', 'Matthew', 'Salli', 'Kimberly', 'Kendra', 'Justin', 'Kevin', 'Ruth', 'Stephen', 'Ivy'], {
    message: 'Invalid voice ID. Must be one of: Joanna, Matthew, Salli, Kimberly, Kendra, Justin, Kevin, Ruth, Stephen, Ivy',
  })
  voiceId?: string;

  @ApiPropertyOptional({
    description: 'User ID for tracking',
    example: 'user123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'User ID must be 100 characters or less' })
  userId?: string;
}
