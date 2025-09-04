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

  beforeEach(async () => {
    // Create typed mocks for AWS clients
    sqsMock = mockClient(SQSClient);
    dynamoMock = mockClient(DynamoDBClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoundbiteService,
        ValidationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              aws: { region: 'us-east-1' },
              services: {
                dynamodb: { tableName: 'SoundbiteTable' },
                sqs: { queueUrl: 'https://sqs-url' },
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SoundbiteService>(SoundbiteService);
  });

  afterEach(() => {
    sqsMock.reset();
    dynamoMock.reset();
  });

  describe('createSoundbite', () => {
    it('should create a soundbite successfully', async () => {
      const createSoundbiteDto: CreateSoundbiteDto = {
        text: 'Hello world!',
        voiceId: 'Joanna',
        userId: 'user123',
      };

      sqsMock.on(SendMessageCommand).resolves({});

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

      // Verify SQS was called with SendMessageCommand
      expect(sqsMock.commandCalls(SendMessageCommand)).toHaveLength(1);
    });

    it('should create a soundbite without userId', async () => {
      const createSoundbiteDto: CreateSoundbiteDto = {
        text: 'Hello world!',
        voiceId: 'Joanna',
      };

      sqsMock.on(SendMessageCommand).resolves({});

      const result = await service.createSoundbite(
        createSoundbiteDto.text,
        createSoundbiteDto.voiceId,
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('text', createSoundbiteDto.text);
      expect(result).toHaveProperty('voiceId', createSoundbiteDto.voiceId);
      expect(result).toHaveProperty('status', 'pending');
    });

    it('should throw ProcessingException when SQS send fails', async () => {
      const createSoundbiteDto: CreateSoundbiteDto = {
        text: 'Hello world!',
        voiceId: 'Joanna',
      };

      sqsMock.on(SendMessageCommand).rejects(new Error('SQS Error'));

      await expect(
        service.createSoundbite(
          createSoundbiteDto.text,
          createSoundbiteDto.voiceId,
        ),
      ).rejects.toThrow(ProcessingException);
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
      const mockSoundbite = {
        pk: { S: `development-localstack:${soundbiteId}` },
        sk: { S: `SOUNDBITE#${soundbiteId}` },
        text: { S: 'Hello world!' },
        voiceId: { S: 'Joanna' },
        status: { S: 'ready' },
        s3Key: { S: 'soundbites/test-id-123.mp3' },
        url: {
          S: 'http://localhost:4566/soundbitesbucket/soundbites/test-id-123.mp3',
        },
        createdAt: { S: '2025-01-24T10:00:00.000Z' },
        updatedAt: { S: '2025-01-24T10:01:00.000Z' },
      };

      dynamoMock.on(GetItemCommand).resolves({
        Item: mockSoundbite,
      });

      const result = await service.getSoundbite(soundbiteId);

      expect(result).toEqual({
        id: soundbiteId,
        text: 'Hello world!',
        voiceId: 'Joanna',
        status: 'ready',
        s3Key: 'soundbites/test-id-123.mp3',
        url: 'http://localhost:4566/soundbitesbucket/soundbites/test-id-123.mp3',
        createdAt: '2025-01-24T10:00:00.000Z',
        updatedAt: '2025-01-24T10:01:00.000Z',
        environment: 'development-localstack',
      });

      expect(dynamoMock.commandCalls(GetItemCommand)).toHaveLength(1);
    });

    it('should throw SoundbiteNotFoundException when soundbite not found', async () => {
      const soundbiteId = 'non-existent-id';

      dynamoMock.on(GetItemCommand).resolves({
        Item: undefined,
      });

      await expect(service.getSoundbite(soundbiteId)).rejects.toThrow(
        SoundbiteNotFoundException,
      );
    });

    it('should throw ProcessingException when DynamoDB query fails', async () => {
      const soundbiteId = 'test-id-123';

      dynamoMock.on(GetItemCommand).rejects(new Error('DynamoDB Error'));

      await expect(service.getSoundbite(soundbiteId)).rejects.toThrow(
        ProcessingException,
      );
    });

    it('should handle soundbite without optional fields', async () => {
      const soundbiteId = 'test-id-123';
      const mockSoundbite = {
        pk: { S: `development-localstack:${soundbiteId}` },
        sk: { S: `SOUNDBITE#${soundbiteId}` },
        text: { S: 'Hello world!' },
        voiceId: { S: 'Joanna' },
        status: { S: 'pending' },
        createdAt: { S: '2025-01-24T10:00:00.000Z' },
        updatedAt: { S: '2025-01-24T10:00:00.000Z' },
      };

      dynamoMock.on(GetItemCommand).resolves({
        Item: mockSoundbite,
      });

      const result = await service.getSoundbite(soundbiteId);

      expect(result).toEqual({
        id: soundbiteId,
        text: 'Hello world!',
        voiceId: 'Joanna',
        status: 'pending',
        createdAt: '2025-01-24T10:00:00.000Z',
        updatedAt: '2025-01-24T10:00:00.000Z',
        environment: 'development-localstack',
      });
      expect(result.s3Key).toBeUndefined();
      expect(result.url).toBeUndefined();
    });
  });
});
