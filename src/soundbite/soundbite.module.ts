import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SoundbiteController } from './soundbite.controller';
import { SoundbiteService } from './soundbite.service';
import { SoundbiteValidator } from '../validators/soundbite.validator';
import { ValidationService } from '../services/validation.service';

@Module({
  imports: [ConfigModule],
  controllers: [SoundbiteController],
  providers: [SoundbiteService, SoundbiteValidator, ValidationService],
})
export class SoundbiteModule {}
