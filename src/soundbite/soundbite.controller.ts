import { Controller, Post, Get, Param, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SoundbiteService } from './soundbite.service';
import { CreateSoundbiteDto } from './dto/create-soundbite.dto';

@ApiTags('soundbites')
@Controller('soundbite')
export class SoundbiteController {
  private readonly logger = new Logger(SoundbiteController.name);

  constructor(private readonly soundbiteService: SoundbiteService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new soundbite job' })
  @ApiResponse({
    status: 201,
    description: 'Soundbite job created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'd09347d0-fbbe-48d2-be59-d12a77ff10fe' },
        text: { type: 'string', example: 'Hello, this is a test soundbite!' },
        voiceId: { type: 'string', example: 'Joanna' },
        status: { type: 'string', example: 'pending' },
        createdAt: { type: 'string', example: '2025-07-24T21:57:37.662Z' },
        updatedAt: { type: 'string', example: '2025-07-24T21:57:37.662Z' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createSoundbite(@Body() createSoundbiteDto: CreateSoundbiteDto) {
    this.logger.log(`Creating soundbite with voice: ${createSoundbiteDto.voiceId || 'Joanna'}`);
    
    return this.soundbiteService.createSoundbite(
      createSoundbiteDto.text,
      createSoundbiteDto.voiceId,
      createSoundbiteDto.userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get soundbite status and URL' })
  @ApiParam({ name: 'id', description: 'Soundbite ID', example: 'd09347d0-fbbe-48d2-be59-d12a77ff10fe' })
  @ApiResponse({
    status: 200,
    description: 'Soundbite retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        text: { type: 'string' },
        voiceId: { type: 'string' },
        s3Key: { type: 'string' },
        url: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'ready', 'error'] },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Soundbite not found' })
  async getSoundbite(@Param('id') id: string) {
    this.logger.log(`Fetching soundbite with ID: ${id}`);
    
    return this.soundbiteService.getSoundbite(id);
  }
}
