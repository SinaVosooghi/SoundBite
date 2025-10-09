# API Reference

## Base URL
- **Dev LocalStack**: `http://localhost:3000`
- **Dev AWS (local app) **: `http://localhost:3001`
- **Staging (EC2 mapping)**: as reported by CD workflow (e.g., `http://<ip>:3001`)

## Authentication
All API requests require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Health Check
Check the health status of the API.

**GET** `/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-04T15:30:00.000Z",
  "version": "1.0.0"
}
```

> Planned (not yet implemented): file-upload pipeline endpoints: `/api/upload`, `/api/process`, `/api/status/{fileId}`, `/api/download/{fileId}`. Specs retained below in Planned section.

### Create Soundbite (TTS)
Create a text-to-speech soundbite job.

**POST** `/soundbite`

**Headers:**
- `Idempotency-Key`: UUID v4 (required)

**Request Body:**
```json
{
  "text": "Hello world",
  "voiceId": "Joanna",
  "userId": "optional-user-id"
}
```

**Response (201):**
```json
{
  "id": "d09347d0-fbbe-48d2-be59-d12a77ff10fe",
  "status": "created",
  "url": "https://.../soundbites/d09347d0-fbbe-48d2-be59-d12a77ff10fe.mp3"
}
```

### Get Soundbite
Get the current status/result of a created soundbite.

**GET** `/soundbite/{id}`

**Response:**
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

## Planned: File Upload Pipeline (Not Implemented Yet)

### Upload Audio File
**POST** `/api/upload` (multipart/form-data)

### Process Audio File
**POST** `/api/process` (application/json)

### Check Processing Status
**GET** `/api/status/{fileId}`

### Download Processed File
**GET** `/api/download/{fileId}`

### List Files
Get a list of uploaded files.

**GET** `/api/files`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status

**Response:**
```json
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

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "BAD_REQUEST",
  "message": "Invalid request parameters"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid or missing authentication token"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "FILE_NOT_FOUND",
  "message": "File with ID 'soundbite-abc123def456' not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "DUPLICATE_REQUEST",
  "message": "Request with this idempotency key already exists"
}
```

### 413 Payload Too Large
```json
{
  "success": false,
  "error": "FILE_TOO_LARGE",
  "message": "File size exceeds maximum limit of 100MB"
}
```

### 415 Unsupported Media Type
```json
{
  "success": false,
  "error": "UNSUPPORTED_FORMAT",
  "message": "Audio format not supported. Supported formats: mp3, wav, m4a"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "An internal server error occurred"
}
```

## Data Types

### File Object
```json
{
  "fileId": "string",
  "originalName": "string",
  "size": "number",
  "mimeType": "string",
  "uploadedAt": "string (ISO 8601)",
  "status": "string"
}
```

### Processing Options
```json
{
  "quality": "string (low|medium|high)",
  "format": "string (mp3|wav|m4a)",
  "bitrate": "number (128|192|256|320)"
}
```

### Processing Results
```json
{
  "duration": "number (seconds)",
  "bitrate": "number (kbps)",
  "channels": "number",
  "sampleRate": "number (Hz)",
  "format": "string"
}
```

## Rate Limits

- **Upload**: 10 requests per minute
- **Process**: 5 requests per minute
- **Status Check**: 60 requests per minute
- **Download**: 20 requests per minute

## File Limits

- **Maximum file size**: 100MB
- **Supported formats**: MP3, WAV, M4A
- **Maximum duration**: 60 minutes
- **Minimum duration**: 1 second

## Idempotency

All API endpoints support idempotency using the `idempotencyKey` parameter. This ensures that duplicate requests are handled gracefully without causing side effects.

**Best Practices:**
- Use unique keys for each request
- Include timestamp or UUID in the key
- Retry with the same key if a request fails
- Keys expire after 24 hours

## Examples

### Upload and Process Audio
```bash
# Upload file
curl -X POST \
  -F "file=@audio.mp3" \
  -F "idempotencyKey=upload-$(date +%s)" \
  http://localhost:3000/api/upload

# Process file
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "soundbite-abc123def456",
    "idempotencyKey": "process-$(date +%s)"
  }' \
  http://localhost:3000/api/process

# Check status
curl http://localhost:3000/api/status/soundbite-abc123def456

# Download result
curl -O http://localhost:3000/api/download/soundbite-abc123def456
```

### Error Handling
```bash
# Check response status
if curl -s http://localhost:3000/api/status/soundbite-abc123def456 | grep -q '"success": true'; then
  echo "Processing completed successfully"
else
  echo "Processing failed or still in progress"
fi
```

## SDKs and Libraries

### JavaScript/Node.js
```javascript
const SoundBite = require('soundbite-sdk');

const client = new SoundBite({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key'
});

// Upload and process
const result = await client.uploadAndProcess('audio.mp3', {
  idempotencyKey: 'unique-key'
});
```

### Python
```python
import soundbite

client = soundbite.Client(
    base_url='http://localhost:3000',
    api_key='your-api-key'
)

# Upload and process
result = client.upload_and_process('audio.mp3', {
    'idempotency_key': 'unique-key'
})
```

## Changelog

### Version 1.0.0
- Initial API release
- File upload and processing
- Idempotency support
- Basic error handling
