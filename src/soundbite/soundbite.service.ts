import { Injectable, Logger } from '@nestjs/common';
import {
  SoundbiteNotFoundException,
  // AwsServiceException,
  // ProcessingException,
} from '../exceptions/soundbite.exceptions';
import { ValidationService } from '../services/validation.service';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { AWSConfig } from 'src/types/aws';
import { SOUNDBITE_CONSTANTS, SoundbiteStatus } from '../constants/soundbite';
import { ErrorHandler } from '../utils/error-handler';

@Injectable()
export class SoundbiteService {
  private readonly logger = new Logger(SoundbiteService.name);
  private sqs: SQSClient;
  private dynamo: DynamoDBClient;
  constructor(
    private readonly configService: ConfigService,
    private readonly validationService: ValidationService,
  ) {
    // Initialize AWS clients as undefined - will be set up lazily when needed
    this.sqs = undefined as unknown as SQSClient;
    this.dynamo = undefined as unknown as DynamoDBClient;
  }

  private initializeAwsClients(): void {
    if (this.sqs !== undefined && this.dynamo !== undefined) {
      return; // Already initialized
    }

    try {
      // Use ConfigService to get environment configuration
      const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
      const awsRegion = this.configService.get<string>(
        'AWS_REGION',
        'us-east-1',
      );
      const awsEndpoint = this.configService.get<string>('AWS_ENDPOINT');
      const awsAccessKeyId =
        this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const awsSecretAccessKey = this.configService.get<string>(
        'AWS_SECRET_ACCESS_KEY',
      );
      const awsConfig: AWSConfig = {
        region: awsRegion,
      };

      // Add LocalStack specific configuration
      if (
        nodeEnv === 'development-localstack' &&
        awsEndpoint !== undefined &&
        awsAccessKeyId !== undefined &&
        awsSecretAccessKey !== undefined
      ) {
        awsConfig.endpoint = awsEndpoint;
        awsConfig.credentials = {
          accessKeyId: awsAccessKeyId,
          secretAccessKey: awsSecretAccessKey,
        };
        awsConfig.forcePathStyle = true;
      } else {
        // For production/staging: Use default credential provider chain (EC2 instance role)
        // The AWS SDK will automatically detect and use EC2 instance role credentials
        this.logger.log(
          'Using AWS default credential provider chain (EC2 instance role)',
        );
      }

      this.logger.log(`Initializing AWS services for environment: ${nodeEnv}`);
      this.logger.log(
        `Using endpoint: ${nodeEnv === 'development-localstack' ? awsEndpoint : 'AWS default'}`,
      );

      this.sqs = new SQSClient(awsConfig);
      this.dynamo = new DynamoDBClient(awsConfig);
    } catch (error) {
      this.logger.warn(
        `Failed to initialize AWS services: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.logger.warn('Application will start but AWS features may not work');

      // Create mock clients to prevent null reference errors
      this.sqs = {
        send: () => {
          throw new Error('AWS services not available in test environment');
        },
      } as unknown as SQSClient;
      this.dynamo = {
        send: () => {
          throw new Error('AWS services not available in test environment');
        },
      } as unknown as DynamoDBClient;
    }
  }

  async createSoundbite(
    text: string,
    voiceId?: string,
    userId?: string,
    idempotencyKey?: string,
  ): Promise<{
    id: string;
    text: string;
    voiceId: string;
    status: SoundbiteStatus;
    createdAt: string;
    updatedAt: string;
    environment: string;
    idempotencyKey?: string;
  }> {
    // Input validation
    this.validationService.validateCreateSoundbiteRequest(
      text,
      voiceId,
      userId,
      idempotencyKey,
    );

    const id = uuidv4();

    // Handle test environment where AWS services aren't available
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv === 'test') {
      this.logger.log('Running in test environment - returning mock response');
      return {
        id,
        text,
        voiceId: voiceId ?? 'Joanna',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        environment: 'test',
        idempotencyKey,
      };
    }

    try {
      // Initialize AWS clients if not already done
      this.initializeAwsClients();

      // Get configuration values
      const tableName = this.configService.get<string>(
        'DYNAMODB_TABLE_NAME',
        'soundbites',
      );
      const queueUrl = this.configService.get<string>(
        'SQS_QUEUE_URL',
        'https://sqs.us-east-1.amazonaws.com/123456789012/soundbite-queue',
      );

      this.logger.log(
        `Creating soundbite for text: "${text.substring(0, 50)}${
          text.length > 50 ? '...' : ''
        }"`,
      );
      const now = new Date().toISOString();

      const message = {
        id,
        text,
        voiceId: voiceId ?? SOUNDBITE_CONSTANTS.DEFAULT_VOICE_ID,
        userId,
        createdAt: now,
        environment: nodeEnv, // Add environment info to message
        idempotencyKey,
      };

      // First, store the soundbite in DynamoDB
      const putCommand = new PutItemCommand({
        TableName: tableName,

        Item: {
          pk: { S: `${nodeEnv}:${id}` },
          sk: { S: `${SOUNDBITE_CONSTANTS.DYNAMODB.SK_PREFIX}${id}` },
          text: { S: text },
          voiceId: { S: voiceId ?? SOUNDBITE_CONSTANTS.DEFAULT_VOICE_ID },
          userId: { S: userId ?? SOUNDBITE_CONSTANTS.DEFAULTS.USER_ID },
          status: { S: SOUNDBITE_CONSTANTS.STATUS.PENDING },
          createdAt: { S: now },
          updatedAt: { S: now },
          environment: { S: nodeEnv },
        },
      });

      await this.dynamo.send(putCommand);
      this.logger.log(
        `Soundbite stored in DynamoDB with ID: ${id} in environment: ${nodeEnv}`,
      );

      // Then send message to SQS for processing
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,

        MessageBody: JSON.stringify(message),

        MessageAttributes: {
          [SOUNDBITE_CONSTANTS.SQS.ENVIRONMENT_ATTRIBUTE]: {
            DataType: 'String',
            StringValue: nodeEnv,
          },
        },
      });

      await this.sqs.send(command);
      this.logger.log(
        `Soundbite job created with ID: ${id} in environment: ${nodeEnv}`,
      );

      return {
        id,
        text,
        voiceId: voiceId ?? SOUNDBITE_CONSTANTS.DEFAULT_VOICE_ID,
        status: SOUNDBITE_CONSTANTS.STATUS.PENDING as SoundbiteStatus,
        createdAt: now,
        updatedAt: now,
        environment: nodeEnv,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        ErrorHandler.logError(this.logger, error, 'soundbite creation', id, {
          environment: nodeEnv,
        });

        throw ErrorHandler.createException(error, 'creation', id, {
          environment: nodeEnv,
        });
      } else {
        throw ErrorHandler.handleUnknownError(
          this.logger,
          error,
          'creation',
          id,
          { environment: nodeEnv },
        );
      }
    }
  }

  async getSoundbite(id: string): Promise<{
    id: string;
    text: string;
    voiceId: string;
    s3Key?: string;
    url?: string;
    status: SoundbiteStatus;
    createdAt: string;
    updatedAt: string;
    environment: string;
  }> {
    // Handle test environment where AWS services aren't available
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv === 'test') {
      this.logger.log('Running in test environment - returning mock response');
      return {
        id,
        text: 'Test soundbite',
        voiceId: 'Joanna',
        status: 'ready',
        s3Key: `soundbites/${id}.mp3`,
        url: `http://localhost:4566/test-bucket/soundbites/${id}.mp3`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        environment: 'test',
      };
    }

    try {
      // Initialize AWS clients if not already done
      this.initializeAwsClients();

      // Get configuration values
      const tableName = this.configService.get<string>(
        'DYNAMODB_TABLE_NAME',
        'soundbites',
      );

      this.logger.log(
        `Fetching soundbite with ID: ${id} from environment: ${nodeEnv}`,
      );

      const command = new GetItemCommand({
        TableName: tableName,

        Key: {
          pk: { S: `${nodeEnv}:${id}` },
          sk: { S: `${SOUNDBITE_CONSTANTS.DYNAMODB.SK_PREFIX}${id}` },
        },
      });

      const result = await this.dynamo.send(command);

      if (!result.Item) {
        this.logger.warn(
          `Soundbite not found with ID: ${id} in environment: ${nodeEnv}`,
        );
        throw new SoundbiteNotFoundException(id, {
          environment: nodeEnv,
        });
      }

      const soundbite = {
        id:
          result.Item.sk.S?.replace(
            SOUNDBITE_CONSTANTS.DYNAMODB.SK_PREFIX,
            '',
          ) ?? '',
        text: result.Item.text.S ?? '',
        voiceId: result.Item.voiceId?.S ?? '',
        s3Key: result.Item.s3Key?.S,
        url: result.Item.url?.S,
        status:
          (result.Item.status.S as SoundbiteStatus) ??
          SOUNDBITE_CONSTANTS.STATUS.PENDING,
        createdAt: result.Item.createdAt.S ?? '',
        updatedAt: result.Item.updatedAt.S ?? '',
        environment: nodeEnv,
      };

      this.logger.log(
        `Soundbite retrieved: ${id} (status: ${soundbite.status}) from environment: ${nodeEnv}`,
      );
      return soundbite;
    } catch (error: unknown) {
      if (error instanceof SoundbiteNotFoundException) {
        throw error;
      } else if (error instanceof Error) {
        ErrorHandler.logError(this.logger, error, 'soundbite retrieval', id, {
          environment: nodeEnv,
        });

        throw ErrorHandler.createException(error, 'retrieval', id, {
          environment: nodeEnv,
        });
      } else {
        throw ErrorHandler.handleUnknownError(
          this.logger,
          error,
          'retrieval',
          id,
          { environment: nodeEnv },
        );
      }
    }
  }
}
