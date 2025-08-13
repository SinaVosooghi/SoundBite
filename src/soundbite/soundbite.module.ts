import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SoundbiteController } from './soundbite.controller';
import { SoundbiteService } from './soundbite.service';

@Module({
  imports: [ConfigModule],
  controllers: [SoundbiteController],
  providers: [SoundbiteService],
})
export class SoundbiteModule {}
