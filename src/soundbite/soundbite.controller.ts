import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create a new soundbite job' })
  @ApiResponse({
    status: 201,
    description: 'Soundbite job created successfully',
    type: CreateSoundbiteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  async createSoundbite(
    @Body() createSoundbiteDto: CreateSoundbiteDto,
  ): Promise<CreateSoundbiteResponseDto> {
    this.logger.log(
      `Creating soundbite with voice: ${createSoundbiteDto.voiceId || 'Joanna'}`,
    );

    return this.soundbiteService.createSoundbite(
      createSoundbiteDto.text,
      createSoundbiteDto.voiceId,
      createSoundbiteDto.userId,
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
