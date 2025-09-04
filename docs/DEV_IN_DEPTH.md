# SoundBite Development In-Depth

_Last updated: 2023-09-15_

This document provides detailed technical information about key architectural decisions, trade-offs, and implementation details for the SoundBite project. It's intended for developers who need to understand the system at a deeper level.

## API Runtime Decision

### Current Implementation: EC2-hosted Container

The SoundBite API is currently deployed as a containerized application running on EC2 instances. This approach was chosen for the following reasons:

1. **Familiarity**: The team has extensive experience with EC2 and container deployments
2. **Control**: Direct access to the underlying infrastructure for debugging and monitoring
3. **Performance**: Predictable performance characteristics with dedicated resources
4. **Cost Predictability**: Fixed costs for steady workloads

### Alternative: ECS Fargate

**Advantages**:
- No server management required
- Automatic scaling based on demand
- Pay-per-use pricing model
- Simplified deployment and management

**Disadvantages**:
- Less control over the underlying infrastructure
- Potential cold start issues for infrequent traffic
- More complex networking setup for VPC integration

### Alternative: Lambda + API Gateway

**Advantages**:
- Fully serverless architecture
- Automatic scaling to zero when not in use
- Pay-only-for-what-you-use pricing
- Simplified deployment and infrastructure

**Disadvantages**:
- 29-second timeout limitation for API Gateway
- Cold start latency for infrequent traffic
- Less suitable for long-running operations
- More complex local development setup

### Migration Plan

We plan to migrate from EC2 to ECS Fargate in the next development cycle for the following reasons:

1. **Operational Overhead**: Reduce management of EC2 instances
2. **Cost Optimization**: Better resource utilization and scaling
3. **Deployment Simplification**: Streamlined CI/CD pipeline

The migration will be performed in phases:
1. Create parallel Fargate deployment
2. Validate performance and functionality
3. Gradually shift traffic using DNS
4. Maintain EC2 capability for rollback

## SQS Queue Configuration

### Message Visibility Timeout

The SQS queue is configured with a visibility timeout of 130 seconds, which was determined based on:

1. **Processing Time Analysis**: 95th percentile processing time is ~4.2 seconds
2. **Buffer for Variance**: 3x standard processing time for outliers
3. **AWS Lambda Timeout**: Lambda function timeout is set to 120 seconds
4. **Safety Margin**: Additional 10 seconds to prevent premature reprocessing

### DLQ and Redrive Policy

Messages are sent to the Dead Letter Queue (DLQ) after 3 failed processing attempts. This number was chosen to:

1. Allow for transient AWS service issues
2. Prevent excessive retries for permanently failing messages
3. Balance between reliability and timely failure detection

The DLQ has an automated redrive capability that:
1. Runs every 15 minutes in development and staging environments
2. Is manually triggered in production for safety
3. Adds exponential backoff between retries
4. Preserves original message attributes with added metadata

### SQS Performance Tuning

For optimal performance, we've configured:

1. **Long Polling**: 20-second wait time to reduce API calls and latency
2. **Batch Size**: Lambda processes up to 10 messages per invocation
3. **Concurrency**: Lambda concurrency limit of 10 to prevent DynamoDB throttling
4. **Message Retention**: 14-day retention period for the DLQ

## Security Implementation Details

### CSP Nonce Implementation

The Content Security Policy uses a cryptographically secure nonce generated for each request:

1. **Generation**: `randomBytes(16).toString('base64')` in the security middleware
2. **Propagation**: Added to the request object and accessible in templates
3. **Application**: Applied to all script and style tags in the response
4. **Development Mode**: Allows `unsafe-inline` only in development environment
5. **Reporting**: CSP violations are reported to `/api/csp-report` endpoint

### Rate Limiting Strategy

Rate limiting is implemented with the following characteristics:

1. **Window Size**: Configurable per environment (default: 15 minutes)
2. **Limit**: Configurable per environment (default: 100 requests per window)
3. **Response Headers**: Includes standard rate limit headers (RateLimit-*)
4. **Storage**: In-memory for single instance, Redis for distributed deployment
5. **Bypass Rules**: Health checks and internal requests are exempted

### Idempotency Implementation

The idempotency system ensures that duplicate requests are handled correctly:

1. **Key Requirements**: UUID v4 format required in `Idempotency-Key` header for POST requests
2. **Storage**: In-memory LRU cache with Redis fallback
3. **TTL**: Configurable per endpoint (default: 24 hours)
4. **Conflict Handling**: Returns 409 Conflict with original response if body differs
5. **Cache Structure**: Stores request body hash, status code, and response body

## Data Management

### DynamoDB Schema Design

The DynamoDB table uses a composite key structure optimized for multi-environment support:

1. **Partition Key (pk)**: `${environment}:${id}` for environment isolation
2. **Sort Key (sk)**: `SOUNDBITE#${id}` for future extensibility
3. **GSI**: Environment + CreatedAt for time-based queries
4. **GSI**: UserId + Environment for user-specific queries
5. **TTL**: 30-day automatic cleanup for ephemeral data

### S3 Storage Strategy

The S3 bucket is configured with:

1. **Lifecycle Rules**: Transition to IA after 30 days, expire after 90 days
2. **Access Control**: Block all public access, use presigned URLs only
3. **Versioning**: Enabled for accidental deletion protection
4. **Encryption**: Server-side encryption with AWS managed keys
5. **CORS**: Configured to allow web playback from authorized domains

## Caching Strategy

### In-Memory Cache

The default in-memory cache provider:

1. **Implementation**: LRU cache with configurable max size
2. **Eviction Policy**: Least Recently Used with size-based eviction
3. **Thread Safety**: Mutex-based locking for concurrent access
4. **Metrics**: Hit/miss rates logged for monitoring

### Redis Cache

The Redis cache provider (optional):

1. **Connection**: Configurable endpoint with connection pooling
2. **Fallback**: Automatic fallback to in-memory cache on connection failure
3. **Reconnection**: Exponential backoff strategy for reconnection attempts
4. **Key Prefix**: Environment-specific prefixes to prevent collisions
5. **Serialization**: JSON serialization with compression for large values

## Error Handling Philosophy

### RFC 7807 Problem Details

All API errors follow the RFC 7807 Problem Details format:

1. **Type**: URI reference to the problem type
2. **Title**: Human-readable summary of the problem
3. **Status**: HTTP status code
4. **Detail**: Human-readable explanation specific to this occurrence
5. **Instance**: URI reference identifying the specific occurrence
6. **Extensions**: Additional properties like timestamp, correlationId, etc.

### Error Propagation Strategy

Errors are handled with the following principles:

1. **Domain-Specific Exceptions**: Custom exception classes for business logic errors
2. **Centralized Handling**: Global exception filter for consistent formatting
3. **Logging**: Structured logging with correlation IDs and context
4. **Client vs. Server**: Clear distinction between client errors (4xx) and server errors (5xx)
5. **Validation Errors**: Detailed field-level validation errors with suggestions

## Local Development Environment

### LocalStack Integration

The local development environment uses LocalStack to emulate AWS services:

1. **Services**: S3, DynamoDB, SQS, Lambda, and other required services
2. **Persistence**: Persistent data between restarts for development continuity
3. **Initialization**: Automatic resource creation on startup
4. **Credentials**: Fixed test credentials for simplicity

### Docker Compose Setup

The docker-compose configuration includes:

1. **API Container**: NestJS application with hot reloading
2. **LocalStack**: AWS service emulation
3. **Redis**: Optional caching service
4. **Network**: Shared network for service discovery
5. **Volumes**: Persistent storage for development data

## Performance Optimization Techniques

### API Response Time Optimization

To achieve sub-100ms response times:

1. **Async Processing**: Non-blocking I/O for all operations
2. **Connection Pooling**: Reuse connections to AWS services
3. **Minimal Payload**: Only essential data in responses
4. **Efficient Validation**: Optimized validation pipelines
5. **Caching**: Strategic caching of frequently accessed data

### Lambda Cold Start Mitigation

To minimize Lambda cold start impact:

1. **Provisioned Concurrency**: For production environment
2. **Code Optimization**: Minimal dependencies and efficient imports
3. **Memory Allocation**: Optimized memory settings (512MB)
4. **Warm-Up**: Periodic invocation to keep functions warm
5. **SDK Initialization**: Lazy loading of AWS SDK clients

## Monitoring and Observability

### CloudWatch Alarms

Critical alarms are configured for:

1. **DLQ Messages**: Any messages in DLQ (threshold: 1)
2. **Queue Depth**: High message count in main queue (threshold: 100)
3. **Message Age**: Old messages in queue (threshold: 5 minutes)
4. **Lambda Errors**: Failed Lambda invocations (threshold: 1%)
5. **API Latency**: High API response times (threshold: 300ms p95)

### Custom Metrics

Custom metrics are emitted for:

1. **Synthesis Time**: Time taken for text-to-speech conversion
2. **Cache Performance**: Hit/miss rates for caching layers
3. **Idempotency Usage**: Idempotent request statistics
4. **Voice Distribution**: Usage patterns of different voices
5. **Text Length**: Distribution of text lengths processed

## Future Architectural Considerations

### Multi-Region Deployment

For future high-availability requirements:

1. **Active-Passive**: Primary region with failover capability
2. **Data Replication**: Cross-region replication for S3 and DynamoDB
3. **DNS Routing**: Route 53 health checks and failover routing
4. **Regional Endpoints**: Region-specific API endpoints

### Multi-Tenant Support

If multi-tenant support becomes necessary:

1. **Authentication**: JWT/OAuth2 integration with Cognito
2. **Authorization**: Fine-grained access control with custom authorizers
3. **Data Isolation**: Tenant-specific partitioning in DynamoDB
4. **Rate Limiting**: Per-tenant rate limiting and quotas
5. **Billing**: Usage tracking for tenant-specific billing