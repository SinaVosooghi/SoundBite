"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_polly_1 = require("@aws-sdk/client-polly");
const client_s3_1 = require("@aws-sdk/client-s3");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const logger_1 = require("./logger");
// Determine runtime environment
// Treat ONLY "development-localstack" as local. Staging/production should use AWS defaults.
const nodeEnv = process.env.NODE_ENV ?? 'production';
const isLocal = nodeEnv === 'development-localstack';
// Client factories
function createS3Client() {
    if (isLocal) {
        return new client_s3_1.S3Client({
            endpoint: 'http://localhost:4566',
            region: process.env.AWS_REGION ?? 'us-east-1',
            credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
            forcePathStyle: true,
        });
    }
    return new client_s3_1.S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
}
function createDynamoClient() {
    if (isLocal) {
        return new client_dynamodb_1.DynamoDBClient({
            endpoint: 'http://localhost:4566',
            region: process.env.AWS_REGION ?? 'us-east-1',
            credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
        });
    }
    return new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
}
function createPollyClient() {
    if (isLocal) {
        return null; // use mock in local mode
    }
    return new client_polly_1.PollyClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
}
const polly = createPollyClient();
const s3 = createS3Client();
const dynamo = createDynamoClient();
const BUCKET_NAME = process.env.BUCKET_NAME ?? 'default-bucket';
const TABLE_NAME = process.env.TABLE_NAME ?? 'default-table';
const logger = new logger_1.LambdaLogger('SoundBiteProcessor');
// Mock Polly service for local development
function mockPollySynthesize(text, voiceId) {
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
const handler = async (event) => {
    logger.info('SQS batch processing started', {
        messageCount: event.Records.length,
    });
    for (const record of event.Records) {
        const startTime = Date.now();
        const messageId = record.messageId;
        try {
            logger.info('Message processing started', { messageId });
            const body = JSON.parse(record.body);
            const { id, text, voiceId, userId } = body;
            // 1. Synthesize speech (mock for local, real for production)
            let audio = Buffer.from([]);
            if (isLocal) {
                audio = await mockPollySynthesize(text, voiceId ?? client_polly_1.VoiceId.Joanna);
            }
            else {
                const synthesizeSpeechCommand = new client_polly_1.SynthesizeSpeechCommand({
                    OutputFormat: 'mp3',
                    Text: text,
                    VoiceId: (voiceId ?? client_polly_1.VoiceId.Joanna),
                });
                const synthRes = await polly?.send(synthesizeSpeechCommand);
                if (synthRes?.AudioStream) {
                    audio = await streamToBuffer(synthRes.AudioStream);
                }
            }
            // 2. Upload to S3
            const s3Key = `soundbites/${id}.mp3`;
            await s3.send(new client_s3_1.PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key,
                Body: audio,
                ContentType: 'audio/mpeg',
                Metadata: {
                    'soundbite-id': id,
                    'voice-id': voiceId ?? 'Joanna',
                    'text-length': text.length.toString(),
                },
            }));
            // 3. Generate pre-signed GET URL for the uploaded object
            const url = await (0, s3_request_presigner_1.getSignedUrl)(s3, new client_s3_1.GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key,
            }), { expiresIn: 60 * 60 * 24 }); // 24h
            // 4. Upsert metadata to DynamoDB with TTL using same key schema as API (pk/sk)
            const now = new Date().toISOString();
            const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days from now
            const item = {
                pk: { S: `${nodeEnv}:${id}` },
                sk: { S: `SOUNDBITE#${id}` },
                text: { S: text },
                voiceId: { S: voiceId ?? 'Joanna' },
                s3Key: { S: s3Key },
                url: { S: url },
                status: { S: 'ready' },
                createdAt: { S: now },
                updatedAt: { S: now },
                environment: { S: nodeEnv },
                ttl: { N: ttl.toString() }, // TTL for automatic cleanup
            };
            if (voiceId !== undefined && voiceId !== null && voiceId.length > 0) {
                item.voiceId = { S: voiceId };
            }
            if (userId !== undefined && userId !== null && userId.length > 0) {
                item.userId = { S: userId };
            }
            await dynamo.send(new client_dynamodb_1.PutItemCommand({
                TableName: TABLE_NAME,
                Item: item,
            }));
            const processingTime = Date.now() - startTime;
            logger.info('Soundbite processing completed', {
                soundbiteId: id,
                messageId,
                processingTime,
                textLength: text.length,
                voiceId,
            });
        }
        catch (error) {
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
exports.handler = handler;
function streamToBuffer(stream) {
    if (!stream) {
        throw new Error('Audio stream is undefined');
    }
    return new Promise((resolve, reject) => {
        // Handle Blob type (has arrayBuffer method)
        if ('arrayBuffer' in stream && typeof stream.arrayBuffer === 'function') {
            stream
                .arrayBuffer()
                .then((buffer) => resolve(Buffer.from(buffer)))
                .catch(reject);
            return;
        }
        // Handle Node.js Readable stream (has on method)
        if ('on' in stream && typeof stream.on === 'function') {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
            return;
        }
        // Handle ReadableStream (Web API)
        if ('getReader' in stream && typeof stream.getReader === 'function') {
            const reader = stream.getReader();
            const chunks = [];
            const pump = () => {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                        const result = new Uint8Array(totalLength);
                        let offset = 0;
                        for (const chunk of chunks) {
                            result.set(chunk, offset);
                            offset += chunk.length;
                        }
                        resolve(Buffer.from(result));
                        return;
                    }
                    chunks.push(value);
                    return pump();
                });
            };
            pump().catch(reject);
            return;
        }
        reject(new Error('Unsupported stream type'));
    });
}
