import 'reflect-metadata';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.AWS_REGION = 'us-east-1';
  process.env.DYNAMODB_TABLE = 'test-soundbites-table';
  process.env.S3_BUCKET = 'test-soundbites-bucket';
  process.env.SQS_QUEUE_URL = 'http://localhost:4566/000000000000/test-queue';
});

// Global test teardown
afterAll(async () => {
  // Clean up any global resources
});

// Mock AWS SDK clients globally
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-sqs');
jest.mock('@aws-sdk/client-polly');

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
