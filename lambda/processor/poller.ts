#!/usr/bin/env ts-node

import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { handler } from './index';

// Configure SQS client for LocalStack
const sqs = new SQSClient({
  endpoint: 'http://localhost:4566',
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

const queueUrl = process.env.SQS_QUEUE_URL!;

if (!queueUrl) {
  console.error('[ERROR] SQS_QUEUE_URL environment variable is required');
  process.exit(1);
}

console.log(`[INFO] Starting SQS poller for queue: ${queueUrl}`);
console.log('[INFO] Press Ctrl+C to stop');

async function poll() {
  while (true) {
    try {
      // Receive messages from SQS
      const { Messages } = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 1,
          WaitTimeSeconds: 10,
          VisibilityTimeout: 60,
        })
      );

      if (Messages && Messages.length > 0) {
        for (const msg of Messages) {
          try {
            console.log(`[INFO] Processing message: ${msg.MessageId}`);
            
            // Process the message using the Lambda handler
            await handler({ 
              Records: [{
                messageId: msg.MessageId,
                receiptHandle: msg.ReceiptHandle,
                body: msg.Body,
                attributes: msg.Attributes || {},
                messageAttributes: msg.MessageAttributes || {},
                md5OfBody: msg.MD5OfBody,
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-east-1:000000000000:SoundbiteQueue',
                awsRegion: 'us-east-1'
              }]
            } as any, {} as any, () => {});
            
            // Delete the message after successful processing
            await sqs.send(
              new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: msg.ReceiptHandle!,
              })
            );
            
            console.log(`[SUCCESS] Message ${msg.MessageId} processed and deleted`);
          } catch (error) {
            console.error(`[ERROR] Failed to process message ${msg.MessageId}:`, error);
            // Don't delete the message - let it go to DLQ or retry
          }
        }
      }
    } catch (error) {
      console.error('[ERROR] Polling error:', error);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[INFO] Shutting down SQS poller...');
  process.exit(0);
});

// Start polling
poll().catch((error) => {
  console.error('[FATAL] Poller failed:', error);
  process.exit(1);
}); 