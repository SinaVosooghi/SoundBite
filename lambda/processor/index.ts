import { SQSHandler } from 'aws-lambda';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const localOptions = {
  endpoint: 'http://localhost:4566',
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  forcePathStyle: true,
};

const isLocal = process.env.NODE_ENV !== 'production';
const polly = isLocal ? null : new PollyClient(localOptions);
const s3 = new S3Client(localOptions);
const dynamo = new DynamoDBClient(localOptions);

const BUCKET_NAME = process.env.BUCKET_NAME!;
const TABLE_NAME = process.env.TABLE_NAME!;

// Mock Polly service for local development
function mockPollySynthesize(
  text: string,
  voiceId: string,
): Promise<Buffer> {
  console.log(
    `[MOCK] Synthesizing speech for text: "${text}" with voice: ${voiceId}`,
  );
  // Generate a dummy MP3 buffer (1 second of silence)
  const dummyMp3 = Buffer.from([
    0xff, 0xfb, 0x90, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  return Promise.resolve(dummyMp3);
}

export const handler: SQSHandler = async (event) => {
  console.log(`Processing ${event.Records.length} SQS message(s)`);
  
  for (const record of event.Records) {
    const startTime = Date.now();
    const messageId = record.messageId;
    
    try {
      console.log(`Processing message: ${messageId}`);
      
      const body = JSON.parse(record.body) as {
        id: string;
        text: string;
        voiceId?: string;
        userId?: string;
      };
      const { id, text, voiceId, userId } = body;
      
      // 1. Synthesize speech (mock for local, real for production)
      let audio: Buffer;
      if (isLocal) {
        audio = await mockPollySynthesize(text, voiceId || 'Joanna');
      } else {
        const synthRes = await polly!.send(
          new SynthesizeSpeechCommand({
            OutputFormat: 'mp3',
            Text: text,
            VoiceId: (voiceId || 'Joanna') as any,
          })
        );
        audio = await streamToBuffer(synthRes.AudioStream);
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
            'voice-id': voiceId || 'Joanna',
            'text-length': text.length.toString(),
          },
        })
      );
      
      // 3. Generate pre-signed URL
      const url = await getSignedUrl(s3, new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      }), { expiresIn: 60 * 60 * 24 }); // 24h
      
      // 4. Write metadata to DynamoDB with TTL
      const now = new Date().toISOString();
      const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days from now
      
      const item: any = {
        id: { S: id },
        text: { S: text },
        s3Key: { S: s3Key },
        url: { S: url },
        status: { S: 'ready' },
        createdAt: { S: now },
        updatedAt: { S: now },
        ttl: { N: ttl.toString() }, // TTL for automatic cleanup
      };
      
      if (voiceId) item.voiceId = { S: voiceId };
      if (userId) item.userId = { S: userId };
      
      await dynamo.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: item,
        })
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`Successfully processed soundbite ${id} in ${processingTime}ms`);
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Error processing message ${messageId} after ${processingTime}ms:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        messageId,
        recordBody: record.body,
      });
      
      // Let Lambda retry, or send to DLQ
      throw error;
    }
  }
};

function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
} 