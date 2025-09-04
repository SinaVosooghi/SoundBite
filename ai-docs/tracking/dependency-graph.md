# System Dependencies and Relationships

## High-Level System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub        │    │   AWS           │    │   LocalStack    │
│   Actions       │    │   Services      │    │   (Testing)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OIDC          │    │   SoundBite     │    │   Test          │
│   Authentication│    │   Platform      │    │   Environment   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Detailed Component Dependencies

### 1. CI/CD Pipeline Dependencies

```
GitHub Actions
├── OIDC Authentication
│   ├── GitHub Identity Provider
│   ├── IAM Roles (Dev/Prod)
│   └── AWS STS
├── Code Checkout
├── Node.js Setup
├── Yarn Package Management
├── Testing (Jest + LocalStack)
├── Building (TypeScript)
├── Security Scanning
├── Docker Building
└── Deployment (CDK)
```

### 2. AWS Service Dependencies

```
API Gateway (EC2-based)
├── Lambda Functions
│   ├── DynamoDB (Idempotency)
│   ├── S3 (Audio Storage)
│   └── SQS (Message Queue)
├── CloudWatch (Monitoring)
└── IAM (Permissions)
```

### 3. Application Dependencies

```
SoundBite Application
├── Node.js 22
├── TypeScript
├── Yarn 4.9.4
├── AWS SDK
├── Jest (Testing)
├── CDK (Infrastructure)
└── Docker (Containerization)
```

## Dependency Relationships

### 1. Authentication Flow
```
GitHub Actions
    ↓ (OIDC Token)
AWS STS
    ↓ (Temporary Credentials)
AWS Services
    ↓ (API Calls)
SoundBite Platform
```

### 2. Data Flow
```
User Request
    ↓
API Gateway (EC2)
    ↓
Lambda Function
    ↓
DynamoDB (Idempotency Check)
    ↓
S3 (Audio Storage)
    ↓
SQS (Processing Queue)
    ↓
Lambda Function (Processing)
    ↓
DynamoDB (Result Storage)
```

### 3. Development Flow
```
Developer
    ↓ (Code Push)
GitHub
    ↓ (Webhook)
GitHub Actions
    ↓ (OIDC)
AWS
    ↓ (Deploy)
SoundBite Platform
```

## Critical Dependencies

### 1. OIDC Authentication Chain
- **GitHub Actions** → **OIDC Provider** → **IAM Role** → **AWS STS** → **Temporary Credentials**
- **Failure Point**: Any break in this chain prevents deployment
- **Mitigation**: Direct AWS CLI approach for reliability

### 2. Idempotency System
- **API Gateway** → **Lambda** → **DynamoDB** → **S3** → **SQS**
- **Failure Point**: DynamoDB unavailability breaks idempotency
- **Mitigation**: DynamoDB with high availability configuration

### 3. Audio Processing Pipeline
- **S3** → **SQS** → **Lambda** → **DynamoDB**
- **Failure Point**: SQS unavailability stops processing
- **Mitigation**: SQS with dead letter queues

## External Dependencies

### 1. GitHub Services
- **GitHub Actions**: CI/CD execution
- **GitHub OIDC**: Authentication provider
- **GitHub API**: Repository management

### 2. AWS Services
- **Lambda**: Serverless compute
- **API Gateway**: HTTP API (EC2-based for dev)
- **DynamoDB**: NoSQL database
- **S3**: Object storage
- **SQS**: Message queuing
- **CloudWatch**: Monitoring
- **IAM**: Identity and access management
- **STS**: Security token service

### 3. Development Tools
- **Node.js**: Runtime environment
- **Yarn**: Package management
- **TypeScript**: Type-safe development
- **Jest**: Testing framework
- **Docker**: Containerization
- **LocalStack**: Local AWS emulation

## Dependency Health Status

### ✅ Healthy Dependencies
- **GitHub Actions**: All workflows passing
- **OIDC Authentication**: Working correctly
- **AWS Services**: All services operational
- **LocalStack**: Integration tests passing
- **Docker**: Build system working
- **Jest**: Test framework operational

### ⚠️ Monitored Dependencies
- **GitHub Environment Context**: Temporarily disabled due to OIDC issues
- **Production Environment**: Not yet set up
- **Comprehensive Monitoring**: Basic monitoring only

### ❌ Failed Dependencies
- **None currently**

## Dependency Risk Assessment

### High Risk Dependencies
1. **OIDC Authentication**: Single point of failure for deployments
2. **DynamoDB**: Critical for idempotency system
3. **GitHub Actions**: Critical for CI/CD pipeline

### Medium Risk Dependencies
1. **S3**: Critical for audio storage
2. **SQS**: Critical for processing pipeline
3. **Lambda**: Critical for compute

### Low Risk Dependencies
1. **CloudWatch**: Monitoring only
2. **LocalStack**: Testing only
3. **Docker**: Build system only

## Dependency Monitoring

### Real-time Monitoring
- **Health Checks**: Every 15 minutes
- **Performance Metrics**: Continuous
- **Error Rates**: Continuous
- **Availability**: Continuous

### Alerting
- **Critical Dependencies**: Immediate alerts
- **Medium Dependencies**: 5-minute alerts
- **Low Dependencies**: 15-minute alerts

## Dependency Optimization

### Performance Optimization
- **Lambda Cold Starts**: Minimize with provisioned concurrency
- **DynamoDB Latency**: Use local secondary indexes
- **S3 Transfer**: Use multipart uploads

### Cost Optimization
- **Lambda**: Use appropriate memory allocation
- **DynamoDB**: Use on-demand billing
- **S3**: Use lifecycle policies

### Reliability Optimization
- **Multi-AZ**: Use across all critical services
- **Backup**: Regular backups of critical data
- **Disaster Recovery**: Cross-region replication

## Future Dependencies

### Planned Dependencies
1. **Production Environment**: Full AWS setup
2. **Monitoring Dashboards**: Comprehensive observability
3. **Security Scanning**: Automated security checks
4. **Performance Testing**: Load testing framework

### Potential Dependencies
1. **CDN**: For audio file delivery
2. **Message Queue**: For high-volume processing
3. **Database**: For complex queries
4. **Cache**: For performance optimization
