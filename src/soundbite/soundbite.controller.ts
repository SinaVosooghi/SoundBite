import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { Idempotent } from '../decorators/idempotent.decorator';
import { IdempotencyRequest } from '../middleware/idempotency.middleware';
import { SoundbiteService } from './soundbite.service';
import { CreateSoundbiteDto } from './dto/create-soundbite.dto';
import {
  CreateSoundbiteResponseDto,
  GetSoundbiteResponseDto,
  ErrorResponseDto,
} from './dto/soundbite-response.dto';

@ApiTags('soundbites')
@Controller('soundbite')
export class SoundbiteController {
  private readonly logger = new Logger(SoundbiteController.name);

  constructor(private readonly soundbiteService: SoundbiteService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Idempotent(true, 24 * 60 * 60 * 1000) // Required, 24 hour TTL
  @ApiOperation({
    summary: 'Create a new soundbite job',
    description:
      'Creates a new text-to-speech conversion job. Requires an Idempotency-Key header to prevent duplicate requests.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description:
      'Unique identifier to prevent duplicate requests (UUID v4 format)',
    required: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 201,
    description: 'Soundbite job created successfully',
    type: CreateSoundbiteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or missing/invalid Idempotency-Key',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'Duplicate request detected (same Idempotency-Key with different request body)',
    type: ErrorResponseDto,
  })
  async createSoundbite(
    @Body() createSoundbiteDto: CreateSoundbiteDto,
    @Req() req: IdempotencyRequest,
  ): Promise<CreateSoundbiteResponseDto> {
    this.logger.log(
      `Creating soundbite with voice: ${createSoundbiteDto.voiceId ?? 'Joanna'}, idempotency key: ${req.idempotencyKey}`,
    );

    return this.soundbiteService.createSoundbite(
      createSoundbiteDto.text,
      createSoundbiteDto.voiceId,
      createSoundbiteDto.userId,
      req.idempotencyKey,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get soundbite status and URL' })
  @ApiParam({
    name: 'id',
    description: 'Soundbite ID',
    example: 'd09347d0-fbbe-48d2-be59-d12a77ff10fe',
  })
  @ApiResponse({
    status: 200,
    description: 'Soundbite retrieved successfully',
    type: GetSoundbiteResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Soundbite not found',
    type: ErrorResponseDto,
  })
  async getSoundbite(
    @Param('id') id: string,
  ): Promise<GetSoundbiteResponseDto> {
    this.logger.log(`Fetching soundbite with ID: ${id}`);

    return this.soundbiteService.getSoundbite(id);
  }
}
