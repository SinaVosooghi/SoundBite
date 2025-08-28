import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { getEnvironmentConfig, isLocalStack } from '../config';
import { AWSConfig } from 'src/types/aws';

@Injectable()
export class SoundbiteService {
  private readonly logger = new Logger(SoundbiteService.name);
  private readonly sqs: SQSClient;
  private readonly dynamo: DynamoDBClient;
  private readonly envConfig = getEnvironmentConfig();

  constructor(private readonly configService: ConfigService) {
    // Use environment-aware configuration
    const awsConfig: AWSConfig = {
      region: this.envConfig.aws.region,
    };

    // Add LocalStack specific configuration
    if (
      isLocalStack() &&
      this.envConfig.aws.endpoint &&
      this.envConfig.aws.credentials
    ) {
      awsConfig.endpoint = this.envConfig.aws.endpoint;
      awsConfig.credentials = {
        accessKeyId: this.envConfig.aws.credentials.accessKeyId || 'test',
        secretAccessKey:
          this.envConfig.aws.credentials.secretAccessKey || 'test',
      };
      awsConfig.forcePathStyle = true;
    } else {
      // For production/staging: Use default credential provider chain (EC2 instance role)
      // The AWS SDK will automatically detect and use EC2 instance role credentials
      this.logger.log(
        'Using AWS default credential provider chain (EC2 instance role)',
      );
    }

    this.logger.log(
      `Initializing AWS services for environment: ${this.envConfig.name}`,
    );
    this.logger.log(
      `Using endpoint: ${isLocalStack() ? this.envConfig.aws.endpoint : 'AWS default'}`,
    );

    this.sqs = new SQSClient(awsConfig);
    this.dynamo = new DynamoDBClient(awsConfig);
  }

  async createSoundbite(
    text: string,
    voiceId?: string,
    userId?: string,
  ): Promise<{
    id: string;
    text: string;
    voiceId: string;
    status: 'pending';
    createdAt: string;
    updatedAt: string;
    environment: string;
  }> {
    try {
      this.logger.log(
        `Creating soundbite for text: "${text.substring(0, 50)}${
          text.length > 50 ? '...' : ''
        }"`,
      );

      const id = uuidv4();
      const now = new Date().toISOString();

      const message = {
        id,
        text,
        voiceId: voiceId || 'Joanna',
        userId,
        createdAt: now,
        environment: this.envConfig.name, // Add environment info to message
      };

      // First, store the soundbite in DynamoDB
      const putCommand = new PutItemCommand({
        TableName: this.envConfig.services.dynamodb.tableName,
        Item: {
          pk: { S: `${this.envConfig.name}:${id}` },
          sk: { S: `SOUNDBITE#${id}` },
          text: { S: text },
          voiceId: { S: voiceId || 'Joanna' },
          userId: { S: userId || 'anonymous' },
          status: { S: 'pending' },
          createdAt: { S: now },
          updatedAt: { S: now },
          environment: { S: this.envConfig.name },
        },
      });

      await this.dynamo.send(putCommand);
      this.logger.log(
        `Soundbite stored in DynamoDB with ID: ${id} in environment: ${this.envConfig.name}`,
      );

      // Then send message to SQS for processing
      const command = new SendMessageCommand({
        QueueUrl: this.envConfig.services.sqs.queueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          Environment: {
            DataType: 'String',
            StringValue: this.envConfig.name,
          },
        },
      });

      await this.sqs.send(command);
      this.logger.log(
        `Soundbite job created with ID: ${id} in environment: ${this.envConfig.name}`,
      );

      return {
        id,
        text,
        voiceId: voiceId || 'Joanna',
        status: 'pending' as const,
        createdAt: now,
        updatedAt: now,
        environment: this.envConfig.name,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Log error message and stack trace for debugging
        this.logger.error(
          `Failed to create soundbite: ${error.message}`,
          error.stack || 'No stack trace available',
        );
      } else {
        // Log unexpected error type, if not an instance of Error
        this.logger.error(
          'Failed to create soundbite job: Unknown error type',
          error,
        );
      }

      throw new BadRequestException('Failed to create soundbite job');
    }
  }

  async getSoundbite(id: string): Promise<{
    id: string;
    text: string;
    voiceId: string;
    s3Key?: string;
    url?: string;
    status: 'pending' | 'processing' | 'ready' | 'failed';
    createdAt: string;
    updatedAt: string;
    environment: string;
  }> {
    try {
      this.logger.log(
        `Fetching soundbite with ID: ${id} from environment: ${this.envConfig.name}`,
      );

      const command = new GetItemCommand({
        TableName: this.envConfig.services.dynamodb.tableName,
        Key: {
          pk: { S: `${this.envConfig.name}:${id}` },
          sk: { S: `SOUNDBITE#${id}` },
        },
      });

      const result = await this.dynamo.send(command);

      if (!result.Item) {
        this.logger.warn(
          `Soundbite not found with ID: ${id} in environment: ${this.envConfig.name}`,
        );
        throw new NotFoundException(`No soundbite found with id: ${id}`);
      }

      const soundbite = {
        id: result.Item.sk.S?.replace('SOUNDBITE#', '') || '',
        text: result.Item.text.S || '',
        voiceId: result.Item.voiceId?.S || '',
        s3Key: result.Item.s3Key?.S,
        url: result.Item.url?.S,
        status:
          (result.Item.status.S as
            | 'pending'
            | 'processing'
            | 'ready'
            | 'failed') || 'pending',
        createdAt: result.Item.createdAt.S || '',
        updatedAt: result.Item.updatedAt.S || '',
        environment: this.envConfig.name,
      };

      this.logger.log(
        `Soundbite retrieved: ${id} (status: ${soundbite.status}) from environment: ${this.envConfig.name}`,
      );
      return soundbite;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof Error) {
        this.logger.error(
          `Failed to fetch soundbite ${id}: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          'Failed to fetch soundbite: Unknown error type',
          error,
        );
      }
      throw new BadRequestException('Failed to fetch soundbite');
    }
  }
}
