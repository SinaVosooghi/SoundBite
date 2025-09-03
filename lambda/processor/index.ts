import type { SQSHandler } from 'aws-lambda';
import {
  PollyClient,
  SynthesizeSpeechCommand,
  VoiceId,
  type SynthesizeSpeechCommandOutput,
} from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import type { PutItemInput } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { LambdaLogger } from './logger';

const localOptions = {
  endpoint: 'http://localhost:4566',
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  forcePathStyle: true,
};

const isLocal = process.env.NODE_ENV !== 'production';
const polly = isLocal ? null : new PollyClient(localOptions);
const s3 = new S3Client(localOptions);
const dynamo = new DynamoDBClient(localOptions);

const BUCKET_NAME = process.env.BUCKET_NAME ?? 'default-bucket';
const TABLE_NAME = process.env.TABLE_NAME ?? 'default-table';

const logger = new LambdaLogger('SoundBiteProcessor');

// Mock Polly service for local development
function mockPollySynthesize(text: string, voiceId: string): Promise<Buffer> {
  logger.info('Mock synthesis started', {
    text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
    voiceId,
    textLength: text.length,
  });
  // Generate a dummy MP3 buffer (1 second of silence)
  const dummyMp3 = Buffer.from([
    0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  return Promise.resolve(dummyMp3);
}

export const handler: SQSHandler = async (event) => {
  logger.info('SQS batch processing started', {
    messageCount: event.Records.length,
  });

  for (const record of event.Records) {
    const startTime = Date.now();
    const messageId = record.messageId;

    try {
      logger.info('Message processing started', { messageId });

      const body = JSON.parse(record.body) as {
        id: string;
        text: string;
        voiceId?: string;
        userId?: string;
      };
      const { id, text, voiceId, userId } = body;

      // 1. Synthesize speech (mock for local, real for production)
      let audio: Buffer = Buffer.from([]);
      if (isLocal) {
        audio = await mockPollySynthesize(text, voiceId ?? VoiceId.Joanna);
      } else {
        const synthesizeSpeechCommand = new SynthesizeSpeechCommand({
          OutputFormat: 'mp3',
          Text: text,
          VoiceId: (voiceId ?? VoiceId.Joanna) as VoiceId,
        });
        const synthRes = await polly?.send(synthesizeSpeechCommand);

        if (synthRes?.AudioStream) {
          audio = await streamToBuffer(synthRes.AudioStream);
        }
      }

      // 2. Upload to S3
      const s3Key = `soundbites/${id}.mp3`;
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: audio,
          ContentType: 'audio/mpeg',
          Metadata: {
            'soundbite-id': id,
            'voice-id': voiceId ?? 'Joanna',
            'text-length': text.length.toString(),
          },
        }),
      );

      // 3. Generate pre-signed URL
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
        }),
        { expiresIn: 60 * 60 * 24 },
      ); // 24h

      // 4. Write metadata to DynamoDB with TTL
      const now = new Date().toISOString();
      const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now

      const item: PutItemInput['Item'] = {
        id: { S: id },
        text: { S: text },
        s3Key: { S: s3Key },
        url: { S: url },
        status: { S: 'ready' },
        createdAt: { S: now },
        updatedAt: { S: now },
        ttl: { N: ttl.toString() }, // TTL for automatic cleanup
      };

      if (voiceId !== undefined && voiceId !== null && voiceId.length > 0) {
        item.voiceId = { S: voiceId };
      }
      if (userId !== undefined && userId !== null && userId.length > 0) {
        item.userId = { S: userId };
      }

      await dynamo.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: item,
        }),
      );

      const processingTime = Date.now() - startTime;
      logger.info('Soundbite processing completed', {
        soundbiteId: id,
        messageId,
        processingTime,
        textLength: text.length,
        voiceId,
      });
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('Message processing failed', {
        messageId,
        processingTime,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        recordBody: record.body,
      });

      // Let Lambda retry, or send to DLQ
      throw error;
    }
  }
};

function streamToBuffer(
  stream: SynthesizeSpeechCommandOutput['AudioStream'],
): Promise<Buffer> {
  if (!stream) {
    throw new Error('Audio stream is undefined');
  }

  return new Promise<Buffer>((resolve, reject) => {
    // Handle Blob type (has arrayBuffer method)
    if ('arrayBuffer' in stream && typeof stream.arrayBuffer === 'function') {
      stream
        .arrayBuffer()
        .then((buffer: ArrayBuffer) => resolve(Buffer.from(buffer)))
        .catch(reject);
      return;
    }

    // Handle Node.js Readable stream (has on method)
    if ('on' in stream && typeof stream.on === 'function') {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      return;
    }

    // Handle ReadableStream (Web API)
    if ('getReader' in stream && typeof stream.getReader === 'function') {
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];

      const pump = (): Promise<void> => {
        return reader.read().then(({ done, value }) => {
          if (done) {
            const totalLength = chunks.reduce(
              (acc, chunk) => acc + chunk.length,
              0,
            );
            const result = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
              result.set(chunk, offset);
              offset += chunk.length;
            }
            resolve(Buffer.from(result));
            return;
          }
          chunks.push(value as Uint8Array);
          return pump();
        });
      };

      pump().catch(reject);
      return;
    }

    reject(new Error('Unsupported stream type'));
  });
}
