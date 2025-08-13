import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SoundbiteService {
  private readonly logger = new Logger(SoundbiteService.name);
  private readonly sqs: SQSClient;
  private readonly dynamo: DynamoDBClient;

  constructor(private readonly configService: ConfigService) {
    const isLocal = this.configService.get('NODE_ENV') !== 'production';
    
    const awsConfig = {
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      ...(isLocal && {
        endpoint: this.configService.get('LOCALSTACK_ENDPOINT', 'http://localhost:4566'),
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
        forcePathStyle: true,
      }),
    };

    this.sqs = new SQSClient(awsConfig);
    this.dynamo = new DynamoDBClient(awsConfig);
  }

  async createSoundbite(text: string, voiceId?: string, userId?: string) {
    try {
      this.logger.log(`Creating soundbite for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

      const id = uuidv4();
      const now = new Date().toISOString();

      const message = {
        id,
        text,
        voiceId: voiceId || 'Joanna',
        userId,
        createdAt: now,
      };

      const command = new SendMessageCommand({
        QueueUrl: this.configService.get('SQS_QUEUE_URL'),
        MessageBody: JSON.stringify(message),
      });

      await this.sqs.send(command);
      this.logger.log(`Soundbite job created with ID: ${id}`);

      return {
        id,
        text,
        voiceId: voiceId || 'Joanna',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      this.logger.error(`Failed to create soundbite: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create soundbite job');
    }
  }

  async getSoundbite(id: string) {
    try {
      this.logger.log(`Fetching soundbite with ID: ${id}`);

      const command = new GetItemCommand({
        TableName: this.configService.get('DYNAMODB_TABLE'),
        Key: { id: { S: id } },
      });

      const result = await this.dynamo.send(command);

      if (!result.Item) {
        this.logger.warn(`Soundbite not found with ID: ${id}`);
        throw new NotFoundException(`No soundbite found with id: ${id}`);
      }

      const soundbite = {
        id: result.Item.id.S,
        text: result.Item.text.S,
        voiceId: result.Item.voiceId?.S,
        s3Key: result.Item.s3Key?.S,
        url: result.Item.url?.S,
        status: result.Item.status.S,
        createdAt: result.Item.createdAt.S,
        updatedAt: result.Item.updatedAt.S,
      };

      this.logger.log(`Soundbite retrieved: ${id} (status: ${soundbite.status})`);
      return soundbite;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to fetch soundbite ${id}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch soundbite');
    }
  }
}
