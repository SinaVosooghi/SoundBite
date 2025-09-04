# SoundBite — Architecture Guide

_Last updated: January 2025_

## 1. System Overview

SoundBite is a **production-ready, enterprise-grade** TypeScript/NestJS audio service that converts input text into short, shareable MP3 "soundbites" using AWS Polly. The system is built for low-latency, high-reliability delivery with comprehensive security, idempotency guarantees, and Infrastructure as Code (AWS CDK v2).

### High-Level Flow
```
Client → (REST) NestJS API → Idempotency Middleware → SQS Queue → Lambda Processor → Polly → S3 (MP3)
                                                      ↓
                                                 DynamoDB (job/status metadata)
```

### Core Components
- **API (NestJS, Node 22)**: Validates requests, enforces idempotency, accepts text + voice, enqueues work, exposes job/status retrieval and presigned audio access
- **Idempotency System**: Comprehensive duplicate request prevention with middleware, decorators, and dual cache providers
- **Processor (AWS Lambda)**: Consumes SQS messages, synthesizes audio (Polly), writes MP3 to S3, persists job record to DynamoDB, returns status
- **Storage (S3)**: Immutable object store for resulting MP3s, lifecycle policies for cost control
- **Metadata (DynamoDB)**: Per-soundbite job status, keys, timestamps, optional user association
- **Messaging (SQS)**: Decouples API from synthesis; DLQ captures poison messages
- **IaC (AWS CDK v2)**: Individual stacks for database, storage, queue, compute, and API, with comprehensive testing
- **Local Dev**: LocalStack emulates AWS services; docker-compose for API containers; scripts orchestrate common flows

## 2. Code & Repository Layout

```
/src                # NestJS app (API)
  app.module.ts     # Main application module with middleware configuration
  soundbite/        # controller, service, DTOs, entity
  config/           # environment loader + per-env configs
  middleware/       # security headers, idempotency middleware
  cache/            # caching module and providers (InMemory, Redis)
  decorators/       # custom decorators (@Idempotent, @OptionallyIdempotent)
  exceptions/       # custom exception hierarchy (SoundbiteException)
  filters/          # exception filters for error handling
  guards/           # route guards for additional security
  interfaces/       # TypeScript interfaces (CacheProvider)
  providers/        # cache providers with LRU eviction
  security/         # security reports controller
  validators/       # input validation classes
  utils/            # error shapes and utilities
  domain/           # shared types

/lambda/processor   # SQS→Polly→S3→DynamoDB pipeline
  index.ts         # Main processor with comprehensive error handling
  logger.ts        # Structured logging utilities
  poller.ts        # SQS polling and message processing

/cdk/lib            # CDK stacks (database, storage, queue, compute, api)
/cdk/test           # CDK unit tests + guidance (assertions, integ, cdk-nag)

/docker             # docker-compose.{dev,prod,staging}.yml etc.
/scripts            # entrypoint 'soundbite.sh' and helpers
/.github/workflows  # ci.yml, docker.yml, deploy.yml, security.yml
/docs               # comprehensive documentation
/test               # NestJS integration tests, e2e runners
```

## 3. Idempotency System Architecture

### Overview
The idempotency system ensures that duplicate requests are handled safely without causing duplicate processing or charges. This is critical for a cost-sensitive TTS service.

### Components

#### IdempotencyMiddleware
- **Request Validation**: UUID v4 format validation, request size limits (1MB)
- **Cache Integration**: Dual provider support (InMemory with LRU, Redis for distributed)
- **Response Interception**: Caches successful responses (2xx status codes)
- **Graceful Degradation**: Continues processing if cache fails

#### Cache Providers
- **InMemoryCacheProvider**: LRU eviction, 10,000 entry limit, periodic cleanup
- **RedisCacheProvider**: Distributed caching with persistence (placeholder implementation)

#### Decorators
- **@Idempotent(required, ttl)**: Marks endpoints as requiring idempotency
- **@OptionallyIdempotent()**: Optional idempotency support
- **@IdempotentWithTTL(ttl)**: Custom TTL configuration

### Request Flow
```
1. Client sends request with Idempotency-Key header
2. Middleware validates UUID v4 format and request size
3. Generates request hash (method + path + body + query)
4. Creates cache key: {idempotencyKey}:{requestHash}
5. Checks cache for existing response
6. If found: returns cached response with _cached: true
7. If not found: processes request and caches response
```

## 4. Security Architecture

### Security Middleware
- **Content Security Policy (CSP)**: XSS protection with nonce-based policies
- **Strict Transport Security (HSTS)**: HTTPS enforcement
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME type sniffing protection
- **Referrer-Policy**: Privacy protection
- **Permissions-Policy**: Feature control

### Input Validation
- **SoundbiteValidator**: Comprehensive text and voice validation
- **Request Size Limits**: 1MB limit for idempotency processing
- **UUID Validation**: Strict UUID v4 format enforcement
- **Sanitization**: Cache key sanitization and input cleaning

### Error Handling
- **Custom Exception Hierarchy**: SoundbiteException with specific error types
- **RFC 7807 Problem Details**: Standardized error response format
- **Secure Error Messages**: No sensitive data exposure
- **Structured Logging**: Comprehensive error tracking

## 5. Infrastructure Architecture

### CDK Stack Organization
```
DatabaseStack     # DynamoDB table with GSI and TTL
StorageStack      # S3 bucket with lifecycle policies
QueueStack        # SQS queue with DLQ and monitoring
ComputeStack      # Lambda processor with IAM roles
ApiStack          # API Gateway with custom domain
```

### Multi-Environment Support
- **Development**: LocalStack integration with docker-compose
- **Staging**: Isolated AWS environment for testing
- **Production**: High-availability configuration with monitoring

### Security & Compliance
- **IAM Least Privilege**: Minimal required permissions
- **VPC Integration**: Private subnets for Lambda functions
- **Encryption**: S3 and DynamoDB encryption at rest
- **Monitoring**: CloudWatch alarms and metrics

## 6. Data Flow Architecture

### Request Processing
```
1. Client Request → API Gateway → NestJS API
2. Idempotency Check → Cache Lookup
3. Input Validation → SoundbiteValidator
4. Job Creation → DynamoDB (pending status)
5. Message Enqueue → SQS Queue
6. Response → Client (job ID and status)
```

### Audio Processing
```
1. SQS Message → Lambda Processor
2. Text Extraction → AWS Polly Synthesis
3. Audio Storage → S3 Bucket
4. Metadata Update → DynamoDB (ready status)
5. Presigned URL → Generated for client access
```

### Error Handling
```
1. Validation Errors → 400 Bad Request
2. Idempotency Conflicts → 409 Conflict
3. Processing Errors → DLQ → Manual Review
4. System Errors → 500 Internal Server Error
```

## 7. Performance Characteristics

### Latency Targets
- **API Response**: < 200ms for job creation
- **Audio Synthesis**: 2-5 seconds for typical text lengths
- **Cache Hit**: < 10ms for duplicate requests
- **S3 Access**: < 100ms for presigned URL generation

### Throughput Capabilities
- **Concurrent Requests**: Lambda auto-scaling with SQS batch processing
- **Queue Processing**: Configurable batch sizes (1-10 messages)
- **Cache Performance**: 10,000 entries with LRU eviction
- **Database**: DynamoDB on-demand scaling

### Cost Optimization
- **Idempotency**: Prevents duplicate processing charges
- **S3 Lifecycle**: Automatic cleanup of old audio files
- **DynamoDB TTL**: Automatic metadata cleanup
- **Lambda Optimization**: Efficient memory and timeout configuration

## 8. Monitoring & Observability

### Logging Strategy
- **Structured JSON Logs**: Consistent format across all services
- **Correlation IDs**: Request tracing across service boundaries
- **Error Context**: Comprehensive error information
- **Performance Metrics**: Response times and throughput

### Monitoring Stack
- **CloudWatch**: Metrics, alarms, and dashboards
- **Health Checks**: Container and service health monitoring
- **Error Tracking**: Automated error rate monitoring
- **Performance Monitoring**: Response time and throughput tracking

### Alerting
- **Error Rate Thresholds**: Automated alerts for high error rates
- **Queue Depth Monitoring**: SQS queue depth alerts
- **Lambda Duration**: Processing time monitoring
- **Cache Performance**: Hit/miss ratio tracking

## 9. Development & Deployment

### Local Development
- **One-Command Setup**: `./scripts/soundbite.sh setup`
- **LocalStack Integration**: Complete AWS service emulation
- **Hot Reload**: Instant development feedback
- **Docker Compose**: Multi-service development environment

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and deployment
- **Multi-Environment**: Automated deployment to dev/staging/prod
- **Infrastructure Updates**: CDK deployment with change sets
- **Security Scanning**: Automated vulnerability scanning

### Testing Strategy
- **Unit Tests**: 77+ tests covering all major components
- **Integration Tests**: End-to-end API testing
- **CDK Tests**: Infrastructure testing with assertions
- **Error Scenario Testing**: Comprehensive error handling validation

## 10. Scalability & Future Considerations

### Horizontal Scaling
- **Stateless API**: Load balancer ready
- **Queue-Based Processing**: SQS with auto-scaling
- **Database Scaling**: DynamoDB on-demand
- **Cache Scaling**: Redis cluster support

### Planned Enhancements
- **Authentication System**: OAuth2/JWT integration
- **Advanced Monitoring**: Prometheus/Grafana
- **Multi-Region Support**: Cross-region deployment
- **CDN Integration**: CloudFront for global delivery

---

**This architecture provides a robust, scalable, and maintainable foundation for the SoundBite service, with comprehensive security, reliability, and developer experience features.**