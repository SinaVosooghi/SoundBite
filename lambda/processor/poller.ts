#!/usr/bin/env ts-node

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { handler } from './index';
import { LambdaLogger } from './logger';
import type {
  SQSEvent,
  SQSRecord,
  Context,
  Callback,
  SQSRecordAttributes,
  SQSMessageAttributes,
} from 'aws-lambda';

// Configure SQS client for LocalStack
const sqs = new SQSClient({
  endpoint: 'http://localhost:4566',
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

const logger = new LambdaLogger('SQSPoller');
const queueUrl = process.env.SQS_QUEUE_URL;

if (queueUrl === undefined || queueUrl === null || queueUrl.length === 0) {
  logger.error('SQS_QUEUE_URL environment variable is required');
  process.exit(1);
}

logger.info('SQS poller starting', { queueUrl });
logger.info('Press Ctrl+C to stop polling');

async function poll(): Promise<void> {
  while (true) {
    try {
      // Receive messages from SQS
      const { Messages } = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 10,
          VisibilityTimeout: 60,
        }),
      );

      if (Messages !== undefined && Messages !== null && Messages.length > 0) {
        for (const msg of Messages) {
          try {
            logger.info('Processing message', { messageId: msg.MessageId });

            // Process the message using the Lambda handler
            const mockEvent: SQSEvent = {
              Records: [
                {
                  messageId: msg.MessageId ?? '',
                  receiptHandle: msg.ReceiptHandle ?? '',
                  body: msg.Body ?? '',
                  attributes: (msg.Attributes ?? {}) as SQSRecordAttributes,
                  messageAttributes: (msg.MessageAttributes ??
                    {}) as unknown as SQSMessageAttributes,
                  md5OfBody: msg.MD5OfBody ?? '',
                  eventSource: 'aws:sqs',
                  eventSourceARN:
                    'arn:aws:sqs:us-east-1:000000000000:SoundbiteQueue',
                  awsRegion: 'us-east-1',
                } satisfies Omit<SQSRecord, 'messageAttributes'> & {
                  messageAttributes: Record<string, unknown>;
                },
              ],
            };

            const mockContext: Context = {} as Context;
            const mockCallback: Callback = () => {};

            await handler(mockEvent, mockContext, mockCallback);

            // Delete the message after successful processing
            await sqs.send(
              new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: msg.ReceiptHandle ?? '',
              }),
            );

            logger.info('Message processed and deleted', {
              messageId: msg.MessageId,
            });
          } catch (error) {
            logger.error('Failed to process message', {
              messageId: msg.MessageId,
              error: error instanceof Error ? error.message : String(error),
            });
            // Don't delete the message - let it go to DLQ or retry
          }
        }
      }
    } catch (error) {
      logger.error('Polling error occurred', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down SQS poller...');
  process.exit(0);
});

// Start polling
poll().catch((error) => {
  console.error('[FATAL] Poller failed:', error);
  process.exit(1);
});
