import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Import environment configuration inside the function to avoid module-level initialization
  const { getEnvironmentConfig, getEnvironmentName } = await import('./config');
  const envConfig = getEnvironmentConfig();

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw errors if non-whitelisted values are provided
      transform: true, // Transform payloads to be objects typed according to their DTO classes
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Shareable Soundbite API')
    .setDescription(
      'A serverless API for creating shareable MP3 soundbites from text using AWS Polly TTS',
    )
    .setVersion('1.0')
    .addTag('soundbites')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(envConfig.port);

  logger.log(
    `🚀 Application is running on: http://localhost:${envConfig.port}`,
  );
  logger.log(`🌍 Environment: ${getEnvironmentName()}`);
  logger.log(`📚 API Documentation: http://localhost:${envConfig.port}/api`);

  if (
    envConfig.aws.endpoint !== undefined &&
    envConfig.aws.endpoint !== null &&
    envConfig.aws.endpoint.length > 0
  ) {
    logger.log(`🔗 AWS Endpoint: ${envConfig.aws.endpoint}`);
  } else {
    logger.log(`🔗 AWS Endpoint: AWS default (${envConfig.aws.region})`);
  }
}
void bootstrap();
