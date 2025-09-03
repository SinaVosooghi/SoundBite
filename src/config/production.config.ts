import { registerAs } from '@nestjs/config';

export default registerAs('production', () => ({
  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION ?? 'us-east-1',
    sqsQueueUrl: process.env.SQS_QUEUE_URL,
    dynamoDBTable: process.env.DYNAMODB_TABLE,
    bucketName: process.env.BUCKET_NAME,
  },

  // API Configuration
  api: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    environment: process.env.NODE_ENV ?? 'production',
  },

  // Security Configuration
  security: {
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
    rateLimitLimit: parseInt(process.env.RATE_LIMIT_LIMIT ?? '100', 10),
  },

  // Monitoring Configuration
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableTracing: process.env.ENABLE_TRACING === 'true',
    logRetention: parseInt(process.env.LOG_RETENTION_DAYS ?? '7', 10),
  },

  // Polly Configuration
  polly: {
    defaultVoice: process.env.DEFAULT_VOICE ?? 'Joanna',
    outputFormat: process.env.OUTPUT_FORMAT ?? 'mp3',
    engine: process.env.POLLY_ENGINE ?? 'standard',
  },

  // Storage Configuration
  storage: {
    s3PresignedUrlExpiration: parseInt(
      process.env.S3_PRESIGNED_URL_EXPIRATION ?? '86400',
      10,
    ), // 24 hours
    dynamoDBTTL: parseInt(process.env.DYNAMODB_TTL_DAYS ?? '30', 10), // 30 days
  },
}));
