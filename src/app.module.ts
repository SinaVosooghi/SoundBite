import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SoundbiteModule } from './soundbite/soundbite.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), SoundbiteModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
