import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SoundbiteModule } from './soundbite/soundbite.module';
import { IdempotencyMiddleware } from './middleware/idempotency.middleware';
import { SecurityMiddleware } from './middleware/security.middleware';
import { IdempotencyGuard } from './guards/idempotency.guard';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { SecurityReportsController } from './security/security-reports.controller';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SoundbiteModule,
    CacheModule,
  ],
  controllers: [AppController, SecurityReportsController],
  providers: [
    AppService,
    IdempotencyMiddleware,
    SecurityMiddleware,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: IdempotencyGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*') // Apply security middleware to all routes first
      .apply(IdempotencyMiddleware)
      .forRoutes('*'); // Then apply idempotency middleware
  }
}
