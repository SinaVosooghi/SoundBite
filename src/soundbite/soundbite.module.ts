import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SoundbiteController } from './soundbite.controller';
import { SoundbiteService } from './soundbite.service';
import { SoundbiteValidator } from '../validators/soundbite.validator';

@Module({
  imports: [ConfigModule],
  controllers: [SoundbiteController],
  providers: [SoundbiteService, SoundbiteValidator],
})
export class SoundbiteModule {}
