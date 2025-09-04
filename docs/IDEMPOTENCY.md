# Idempotency Implementation

This document describes the idempotency system implemented for the SoundBite API to prevent duplicate requests and ensure reliable operations.

## Overview

The idempotency system provides:
- **Duplicate Request Prevention**: Ensures the same request isn't processed multiple times
- **Consistent Responses**: Returns the same response for duplicate requests
- **Configurable Caching**: Supports both in-memory and Redis caching
- **Graceful Degradation**: Continues to work even if caching fails

## Architecture

```
Client Request → Idempotency Middleware → Controller → Service
                      ↓
                 Cache Provider (Memory/Redis)
```

### Components

1. **IdempotencyMiddleware**: Main middleware that intercepts requests and manages caching
2. **Cache Providers**: Pluggable cache implementations (InMemory, Redis)
3. **Decorators**: `@Idempotent()` and `@OptionallyIdempotent()` for endpoint configuration
4. **Cache Module**: NestJS module that provides cache provider injection

## Usage

### 1. Controller Decoration

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { Idempotent, OptionallyIdempotent } from '../decorators/idempotent.decorator';

@Controller('soundbite')
export class SoundbiteController {
  
  @Post()
  @Idempotent(true, 24 * 60 * 60 * 1000) // Required, 24 hour TTL
  async createSoundbite(@Body() dto: CreateSoundbiteDto) {
    // This endpoint requires an idempotency key
    return this.service.create(dto);
  }

  @Put(':id')
  @OptionallyIdempotent(false, 60 * 60 * 1000) // Optional, 1 hour TTL
  async updateSoundbite(@Param('id') id: string, @Body() dto: UpdateDto) {
    // This endpoint supports optional idempotency
    return this.service.update(id, dto);
  }
}
```

### 2. Client Requests

#### Required Idempotency
```bash
curl -X POST http://localhost:3000/soundbite \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{"text": "Hello world", "voice": "Joanna"}'
```

#### Optional Idempotency
```bash
# With idempotency key (will be cached)
curl -X PUT http://localhost:3000/soundbite/123 \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440001" \
  -d '{"text": "Updated text"}'

# Without idempotency key (will not be cached)
curl -X PUT http://localhost:3000/soundbite/123 \
  -H "Content-Type: application/json" \
  -d '{"text": "Updated text"}'
```

## Configuration

### Environment Variables

```bash
# Cache provider selection
CACHE_TYPE=memory          # or 'redis'

# Redis configuration (if using Redis)
REDIS_URL=redis://localhost:6379

# Idempotency settings
IDEMPOTENCY_TTL=3600000    # 1 hour in milliseconds
MAX_REQUEST_SIZE=1048576   # 1MB request size limit
```

### Cache Provider Selection

The system automatically selects the cache provider based on the `CACHE_TYPE` environment variable:

- `memory` (default): Uses in-memory cache with LRU eviction
- `redis`: Uses Redis for distributed caching (requires Redis installation)

## Features

### 1. Request Validation

- **UUID v4 Format**: Idempotency keys must be valid UUID v4 format
- **Size Limits**: Requests larger than 1MB are rejected by default
- **Method Filtering**: Only applies to POST, PUT, PATCH requests

### 2. Response Caching

- **Success Only**: Only caches successful responses (2xx status codes)
- **TTL Support**: Configurable time-to-live for cached responses
- **Metadata**: Adds `_idempotent: true` and `_cached: true` to cached responses

### 3. Error Handling

- **Graceful Degradation**: Continues processing if cache is unavailable
- **Detailed Logging**: Comprehensive error logging for debugging
- **Conflict Detection**: Returns 409 for same key with different request body

### 4. Cache Management

#### In-Memory Cache Features
- **LRU Eviction**: Automatically removes oldest entries when full
- **Periodic Cleanup**: Removes expired entries every 5 minutes
- **Memory Efficient**: Configurable max size (default: 1000 entries)

#### Redis Cache Features
- **Distributed**: Shared cache across multiple instances
- **Persistence**: Survives application restarts
- **Scalable**: Handles large numbers of cached responses

## API Responses

### Successful Response (First Request)
```json
{
  "id": "d09347d0-fbbe-48d2-be59-d12a77ff10fe",
  "text": "Hello world",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00Z",
  "_idempotent": true
}
```

### Cached Response (Duplicate Request)
```json
{
  "id": "d09347d0-fbbe-48d2-be59-d12a77ff10fe",
  "text": "Hello world",
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00Z",
  "_idempotent": true,
  "_cached": true
}
```

### Error Responses

#### Missing Idempotency Key
```json
{
  "error": "Bad Request",
  "message": "Idempotency-Key header is required for this operation",
  "statusCode": 400,
  "details": {
    "header": "idempotency-key",
    "description": "Provide a unique identifier to prevent duplicate requests",
    "example": "idempotency-key: 550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Invalid UUID Format
```json
{
  "error": "Bad Request",
  "message": "Invalid idempotency key format. Must be a valid UUID v4.",
  "statusCode": 400,
  "details": {
    "provided": "invalid-key",
    "expected": "UUID v4 format",
    "example": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Request Too Large
```json
{
  "error": "Bad Request",
  "message": "Request body too large for idempotency processing",
  "statusCode": 400,
  "details": {
    "maxSize": "1048576 bytes",
    "actualSize": "2097152 bytes"
  }
}
```

#### Conflict (Same Key, Different Body)
```json
{
  "error": "Conflict",
  "message": "Request conflicts with cached request for the same idempotency key",
  "statusCode": 409,
  "details": {
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "reason": "Request body differs from cached request"
  }
}
```

## Testing

### Unit Tests
```bash
# Test cache providers
yarn test --testPathPatterns="cache.provider.spec"

# Test idempotency middleware
yarn test --testPathPatterns="idempotency.middleware.spec"
```

### Integration Tests
```bash
# Test full idempotency flow
yarn test --testPathPatterns="idempotency.integration.spec"
```

## Monitoring

### Cache Statistics

The system provides cache statistics for monitoring:

```typescript
// Get cache stats
const stats = await cacheProvider.getCacheStats();
console.log(`Cache size: ${stats.size}, Keys: ${stats.entries.length}`);
```

### Logging

The middleware logs important events:
- Cache hits/misses
- Idempotency key validation failures
- Cache operation errors
- Request conflicts

## Best Practices

### 1. Idempotency Key Generation

```javascript
// Client-side UUID v4 generation
function generateIdempotencyKey() {
  return crypto.randomUUID();
}

// Use consistent keys for retries
const idempotencyKey = generateIdempotencyKey();
// Store this key and reuse for retries
```

### 2. Error Handling

```javascript
async function makeIdempotentRequest(data) {
  const idempotencyKey = generateIdempotencyKey();
  
  try {
    const response = await fetch('/soundbite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      if (response.status === 409) {
        // Conflict - same key, different body
        console.warn('Request conflicts with previous request');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // Retry with same idempotency key
    console.error('Request failed, retrying with same key:', idempotencyKey);
    throw error;
  }
}
```

### 3. Cache Sizing

For production deployments:

```bash
# In-memory cache (per instance)
MAX_CACHE_SIZE=10000        # Adjust based on memory availability

# Redis cache (shared)
REDIS_MAXMEMORY=256mb       # Configure Redis memory limit
REDIS_MAXMEMORY_POLICY=allkeys-lru  # Use LRU eviction
```

## Troubleshooting

### Common Issues

1. **Cache Not Working**: Check `CACHE_TYPE` environment variable
2. **Redis Connection Errors**: Verify `REDIS_URL` and Redis server status
3. **Memory Issues**: Reduce `MAX_CACHE_SIZE` or enable Redis
4. **UUID Validation Errors**: Ensure clients generate valid UUID v4 keys

### Debug Mode

Enable debug logging:

```bash
DEBUG=soundbite:idempotency yarn start:dev
```

This will provide detailed logs of cache operations and request processing.