# Your First SoundBite

This guide will walk you through processing your first audio file with SoundBite.

## Prerequisites

- SoundBite installed and running (see [Installation Guide](installation.md))
- An audio file to process (MP3, WAV, or M4A format)
- Basic understanding of HTTP requests

## Step 1: Start SoundBite

```bash
# Start the application
yarn start

# You should see output like:
# Server running on port 3000
# Health check: http://localhost:3000/health
```

## Step 2: Verify the API is Running

```bash
# Check the health endpoint
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-09-04T15:30:00.000Z",
  "version": "1.0.0"
}
```

## Step 3: Upload an Audio File

### Using curl
```bash
# Upload an audio file
curl -X POST \
  -F "file=@/path/to/your/audio.mp3" \
  -F "idempotencyKey=my-first-soundbite-$(date +%s)" \
  http://localhost:3000/api/upload
```

### Using a REST client (Postman, Insomnia, etc.)
```
POST http://localhost:3000/api/upload
Content-Type: multipart/form-data

file: [Select your audio file]
idempotencyKey: my-first-soundbite-1234567890
```

### Expected Response
```json
{
  "success": true,
  "message": "Audio file uploaded successfully",
  "data": {
    "fileId": "soundbite-abc123def456",
    "originalName": "audio.mp3",
    "size": 1024000,
    "mimeType": "audio/mpeg",
    "uploadedAt": "2025-09-04T15:30:00.000Z",
    "status": "uploaded"
  }
}
```

## Step 4: Process the Audio

### Using curl
```bash
# Process the uploaded file
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "soundbite-abc123def456",
    "idempotencyKey": "my-first-soundbite-process-$(date +%s)"
  }' \
  http://localhost:3000/api/process
```

### Expected Response
```json
{
  "success": true,
  "message": "Audio processing started",
  "data": {
    "fileId": "soundbite-abc123def456",
    "processId": "process-xyz789",
    "status": "processing",
    "startedAt": "2025-09-04T15:30:30.000Z",
    "estimatedDuration": "00:02:30"
  }
}
```

## Step 5: Check Processing Status

### Using curl
```bash
# Check the processing status
curl http://localhost:3000/api/status/soundbite-abc123def456
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "fileId": "soundbite-abc123def456",
    "processId": "process-xyz789",
    "status": "completed",
    "progress": 100,
    "startedAt": "2025-09-04T15:30:30.000Z",
    "completedAt": "2025-09-04T15:33:00.000Z",
    "duration": "00:02:30",
    "results": {
      "duration": 150,
      "bitrate": 320,
      "channels": 2,
      "sampleRate": 44100,
      "format": "mp3"
    }
  }
}
```

## Step 6: Download the Processed File

### Using curl
```bash
# Download the processed file
curl -O http://localhost:3000/api/download/soundbite-abc123def456
```

### Expected Response
- The processed audio file will be downloaded to your current directory

## Understanding the Response

### File Upload Response
- **fileId**: Unique identifier for your audio file
- **originalName**: Name of the original file
- **size**: File size in bytes
- **mimeType**: MIME type of the file
- **uploadedAt**: Timestamp when the file was uploaded
- **status**: Current status of the file

### Processing Response
- **processId**: Unique identifier for the processing job
- **status**: Current processing status (uploaded, processing, completed, failed)
- **progress**: Processing progress percentage (0-100)
- **startedAt**: When processing started
- **completedAt**: When processing completed (if completed)
- **duration**: Total processing time
- **results**: Audio file metadata and processing results

## Processing Statuses

- **uploaded**: File has been uploaded and is ready for processing
- **processing**: File is currently being processed
- **completed**: Processing has completed successfully
- **failed**: Processing failed (check error details)

## Error Handling

### Common Errors

#### 1. File Too Large
```json
{
  "success": false,
  "error": "FILE_TOO_LARGE",
  "message": "File size exceeds maximum limit of 100MB"
}
```

#### 2. Unsupported Format
```json
{
  "success": false,
  "error": "UNSUPPORTED_FORMAT",
  "message": "Audio format not supported. Supported formats: mp3, wav, m4a"
}
```

#### 3. Duplicate Request
```json
{
  "success": false,
  "error": "DUPLICATE_REQUEST",
  "message": "Request with this idempotency key already exists"
}
```

#### 4. File Not Found
```json
{
  "success": false,
  "error": "FILE_NOT_FOUND",
  "message": "File with ID 'soundbite-abc123def456' not found"
}
```

## Advanced Usage

### Batch Processing
```bash
# Upload multiple files
for file in *.mp3; do
  curl -X POST \
    -F "file=@$file" \
    -F "idempotencyKey=batch-$(basename "$file" .mp3)-$(date +%s)" \
    http://localhost:3000/api/upload
done
```

### Processing with Custom Options
```bash
# Process with custom options
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "soundbite-abc123def456",
    "idempotencyKey": "custom-process-$(date +%s)",
    "options": {
      "quality": "high",
      "format": "wav",
      "bitrate": 320
    }
  }' \
  http://localhost:3000/api/process
```

### Checking All Files
```bash
# List all uploaded files
curl http://localhost:3000/api/files

# Expected response:
{
  "success": true,
  "data": {
    "files": [
      {
        "fileId": "soundbite-abc123def456",
        "originalName": "audio.mp3",
        "size": 1024000,
        "status": "completed",
        "uploadedAt": "2025-09-04T15:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

## Tips and Best Practices

### 1. Use Unique Idempotency Keys
Always use unique idempotency keys to avoid duplicate processing:
```bash
# Good: Include timestamp
idempotencyKey="my-file-$(date +%s)"

# Good: Include random string
idempotencyKey="my-file-$(uuidgen)"

# Bad: Reusing the same key
idempotencyKey="my-file"
```

### 2. Check Processing Status
Don't assume processing is complete immediately:
```bash
# Wait and check status
sleep 30
curl http://localhost:3000/api/status/soundbite-abc123def456
```

### 3. Handle Errors Gracefully
Always check the response for errors:
```bash
# Check if request was successful
if curl -s http://localhost:3000/api/status/soundbite-abc123def456 | grep -q '"success": true'; then
  echo "Processing completed successfully"
else
  echo "Processing failed or still in progress"
fi
```

### 4. Use Appropriate File Formats
- **MP3**: Best for general use, good compression
- **WAV**: Best for quality, larger file size
- **M4A**: Good balance of quality and size

## Next Steps

- **🏗️ [Architecture Overview](../architecture/system-overview.md)**: Understand how SoundBite works
- **🔧 [Development Guide](../development/local-setup.md)**: Set up your development environment
- **📚 [API Reference](../reference/api-reference.md)**: Complete API documentation
- **🔒 [Security Guide](../reference/security-guide.md)**: Security best practices

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```bash
# Check if the server is running
curl http://localhost:3000/health

# If not running, start the server
yarn start
```

#### 2. File Upload Fails
```bash
# Check file size and format
ls -la your-file.mp3
file your-file.mp3

# Ensure file is under 100MB and in supported format
```

#### 3. Processing Stuck
```bash
# Check processing status
curl http://localhost:3000/api/status/your-file-id

# If stuck, check server logs
yarn logs
```

### Getting Help

- **📚 [Documentation](https://github.com/SinaVosooghi/SoundBite/tree/main/docs)**: Complete documentation
- **🐛 [Issues](https://github.com/SinaVosooghi/SoundBite/issues)**: Report bugs or ask questions
- **💬 [Discussions](https://github.com/SinaVosooghi/SoundBite/discussions)**: Community discussions
