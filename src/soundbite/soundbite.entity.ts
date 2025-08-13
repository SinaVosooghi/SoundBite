import { v4 as uuidv4 } from 'uuid';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type SoundbiteStatus = 'pending' | 'processing' | 'ready' | 'error';

export class Soundbite {
  @ApiProperty()
  id: string;

  @ApiProperty()
  text: string;

  @ApiPropertyOptional()
  voiceId?: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiPropertyOptional()
  s3Key?: string;

  @ApiPropertyOptional()
  url?: string;

  @ApiProperty({ enum: ['pending', 'processing', 'ready', 'error'] })
  status: SoundbiteStatus;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  constructor(partial: Partial<Soundbite>) {
    Object.assign(this, partial);
    this.id = this.id || uuidv4();
    this.status = this.status || 'pending';
    const now = new Date().toISOString();
    this.createdAt = this.createdAt || now;
    this.updatedAt = this.updatedAt || now;
  }
}
