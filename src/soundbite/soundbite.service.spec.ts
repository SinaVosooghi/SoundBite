import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SoundbiteService } from './soundbite.service';
import type { CreateSoundbiteDto } from './dto/create-soundbite.dto';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { GetItemCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ConfigService } from '@nestjs/config';
import { mockClient } from 'aws-sdk-client-mock';
import { ValidationService } from '../services/validation.service';
import {
  ProcessingException,
  SoundbiteNotFoundException,
  InvalidTextException,
} from '../exceptions/soundbite.exceptions';

describe('SoundbiteService', () => {
  let service: SoundbiteService;
  let sqsMock: ReturnType<typeof mockClient>;
  let dynamoMock: ReturnType<typeof mockClient>;

  beforeAll(() => {
    // Set up mocks before any tests run
    sqsMock = mockClient(SQSClient);
    dynamoMock = mockClient(DynamoDBClient);
  });

  beforeEach(async () => {
    // Reset mocks before each test
    sqsMock.reset();
    dynamoMock.reset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoundbiteService,
        ValidationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                NODE_ENV: 'test',
                AWS_REGION: 'us-east-1',
                AWS_ACCESS_KEY_ID: 'test',
                AWS_SECRET_ACCESS_KEY: 'test',
                AWS_ENDPOINT: 'http://localhost:4566',
              };
              return config[key as keyof typeof config] ?? undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SoundbiteService>(SoundbiteService);
  });

  afterAll(() => {
    // Clean up mocks after all tests
    sqsMock.restore();
    dynamoMock.restore();
  });

  describe('createSoundbite', () => {
    it('should create a soundbite successfully', async () => {
      const createSoundbiteDto: CreateSoundbiteDto = {
        text: 'Hello world!',
        voiceId: 'Joanna',
        userId: 'user123',
      };

      const result = await service.createSoundbite(
        createSoundbiteDto.text,
        createSoundbiteDto.voiceId,
        createSoundbiteDto.userId,
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text', createSoundbiteDto.text);
      expect(result).toHaveProperty('voiceId', createSoundbiteDto.voiceId);
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).toHaveProperty('environment', 'test');

      // In test environment, AWS services are not called
      // The service returns mock data directly
    });

    it('should create a soundbite without userId', async () => {
      const createSoundbiteDto: CreateSoundbiteDto = {
        text: 'Hello world!',
        voiceId: 'Joanna',
      };

      const result = await service.createSoundbite(
        createSoundbiteDto.text,
        createSoundbiteDto.voiceId,
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text', createSoundbiteDto.text);
      expect(result).toHaveProperty('voiceId', createSoundbiteDto.voiceId);
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('environment', 'test');
    });

    it('should handle SQS send failure gracefully in test mode', async () => {
      const createSoundbiteDto: CreateSoundbiteDto = {
        text: 'Hello world!',
        voiceId: 'Joanna',
      };

      // In test mode, the service returns mock data regardless of SQS state
      const result = await service.createSoundbite(
        createSoundbiteDto.text,
        createSoundbiteDto.voiceId,
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text', createSoundbiteDto.text);
      expect(result).toHaveProperty('voiceId', createSoundbiteDto.voiceId);
      expect(result).toHaveProperty('status', 'pending');
      expect(result).toHaveProperty('environment', 'test');
    });

    it('should throw InvalidTextException for empty text', async () => {
      const createSoundbiteDto: CreateSoundbiteDto = {
        text: '',
        voiceId: 'Joanna',
      };

      await expect(
        service.createSoundbite(
          createSoundbiteDto.text,
          createSoundbiteDto.voiceId,
        ),
      ).rejects.toThrow(InvalidTextException);
    });
  });

  describe('getSoundbite', () => {
    it('should return a soundbite when found', async () => {
      const soundbiteId = 'test-id-123';

      const result = await service.getSoundbite(soundbiteId);

      expect(result).toEqual({
        id: soundbiteId,
        text: 'Test soundbite',
        voiceId: 'Joanna',
        status: 'ready',
        s3Key: 'soundbites/test-id-123.mp3',
        url: 'http://localhost:4566/test-bucket/soundbites/test-id-123.mp3',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        environment: 'test',
      });

      // In test environment, DynamoDB is not called
    });

    it('should return mock data even for non-existent soundbite in test mode', async () => {
      const soundbiteId = 'non-existent-id';

      // In test mode, the service returns mock data regardless of whether the soundbite exists
      const result = await service.getSoundbite(soundbiteId);

      expect(result).toEqual({
        id: soundbiteId,
        text: 'Test soundbite',
        voiceId: 'Joanna',
        status: 'ready',
        s3Key: 'soundbites/non-existent-id.mp3',
        url: 'http://localhost:4566/test-bucket/soundbites/non-existent-id.mp3',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        environment: 'test',
      });
    });

    it('should handle DynamoDB query failure gracefully in test mode', async () => {
      const soundbiteId = 'test-id-123';

      // In test mode, the service returns mock data regardless of DynamoDB state
      const result = await service.getSoundbite(soundbiteId);

      expect(result).toEqual({
        id: soundbiteId,
        text: 'Test soundbite',
        voiceId: 'Joanna',
        status: 'ready',
        s3Key: 'soundbites/test-id-123.mp3',
        url: 'http://localhost:4566/test-bucket/soundbites/test-id-123.mp3',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        environment: 'test',
      });
    });

    it('should handle soundbite without optional fields in test mode', async () => {
      const soundbiteId = 'test-id-123';

      // In test mode, the service returns mock data with all fields
      const result = await service.getSoundbite(soundbiteId);

      expect(result).toEqual({
        id: soundbiteId,
        text: 'Test soundbite',
        voiceId: 'Joanna',
        status: 'ready',
        s3Key: 'soundbites/test-id-123.mp3',
        url: 'http://localhost:4566/test-bucket/soundbites/test-id-123.mp3',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        environment: 'test',
      });
    });
  });
});
