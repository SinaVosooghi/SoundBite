import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getEnvironmentConfig, getEnvironmentName } from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
    .setDescription('A serverless API for creating shareable MP3 soundbites from text using AWS Polly TTS')
    .setVersion('1.0')
    .addTag('soundbites')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(envConfig.port);
  console.log(`🚀 Application is running on: http://localhost:${envConfig.port}`);
  console.log(`🌍 Environment: ${getEnvironmentName()}`);
  console.log(`📚 API Documentation: http://localhost:${envConfig.port}/api`);
  
  if (envConfig.aws.endpoint) {
    console.log(`🔗 AWS Endpoint: ${envConfig.aws.endpoint}`);
  } else {
    console.log(`🔗 AWS Endpoint: AWS default (${envConfig.aws.region})`);
  }
}
bootstrap();
