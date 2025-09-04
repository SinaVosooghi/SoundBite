# AI Learning Context

## Project Understanding

### Core System Architecture
The SoundBite project is a **serverless audio processing platform** built on AWS with the following key characteristics:

- **Idempotency-First Design**: Every operation is designed to be idempotent to prevent duplicate processing
- **Security-Centric**: Comprehensive security validation and monitoring throughout
- **Infrastructure as Code**: Complete CDK-based infrastructure management
- **Keyless Deployments**: OIDC-based CI/CD without long-lived credentials

### Key Technical Patterns

#### 1. Idempotency Implementation
- **Pattern**: Idempotency keys stored in DynamoDB
- **Purpose**: Prevent duplicate audio processing requests
- **Implementation**: Unique keys generated per request, checked before processing
- **Benefits**: Cost reduction, better UX, industry standard practice

#### 2. OIDC Authentication Flow
- **Pattern**: GitHub Actions → OIDC → AWS STS → Temporary credentials
- **Purpose**: Secure, keyless CI/CD authentication
- **Implementation**: Direct AWS CLI calls with `assume-role-with-web-identity`
- **Benefits**: No credential rotation, better security, audit trail

#### 3. LocalStack Integration
- **Pattern**: Local AWS service emulation for testing
- **Purpose**: Cost-effective integration testing
- **Implementation**: Service containers in GitHub Actions
- **Benefits**: Faster tests, no AWS costs, reliable environment

#### 4. Context-Aware Documentation
- **Pattern**: Dual-layer documentation (AI + Human)
- **Purpose**: Different needs for different users
- **Implementation**: Separate directories with tailored content
- **Benefits**: Better context preservation, living updates

### Problem-Solving Patterns

#### 1. Systematic Debugging Approach
When encountering issues, the project follows this pattern:
1. **Identify the root cause** through systematic investigation
2. **Check multiple sources** (logs, configurations, dependencies)
3. **Implement targeted fixes** rather than broad changes
4. **Verify the fix** with comprehensive testing
5. **Document the solution** for future reference

#### 2. Iterative Improvement
The project demonstrates strong iterative improvement:
- **Yarn version management**: Evolved from 4.0.2 → 4.6.0 → 4.9.4
- **CI/CD authentication**: Evolved from AWS keys → OIDC → Direct CLI
- **Documentation**: Evolved from basic status → comprehensive guides → context-aware system

#### 3. Context Preservation
The project maintains context across sessions through:
- **Comprehensive logging** of all decisions and changes
- **Detailed documentation** of problem-solving approaches
- **Version control** of all configurations and code
- **Automated tracking** of system state and changes

### Common Issues and Solutions

#### 1. Yarn Version Mismatches
**Problem**: CI and local environments use different Yarn versions
**Solution**: Standardize on single version across all environments
**Prevention**: Use `corepack` to manage Yarn versions

#### 2. OIDC Authentication Failures
**Problem**: GitHub Actions OIDC integration issues
**Solution**: Use direct AWS CLI calls instead of GitHub Actions
**Prevention**: Test OIDC configuration thoroughly before deployment

#### 3. YAML Syntax Errors
**Problem**: Backticks in AWS CLI queries cause YAML parsing issues
**Solution**: Use single quotes instead of backticks
**Prevention**: Validate YAML syntax before committing

#### 4. Docker Container Failures
**Problem**: Containers fail to start due to missing AWS credentials
**Solution**: Provide proper AWS credentials to Docker run commands
**Prevention**: Include all required environment variables

### System Dependencies

#### 1. AWS Services
- **Lambda**: Serverless compute for audio processing
- **API Gateway**: HTTP API for external access
- **DynamoDB**: Idempotency key storage and session management
- **S3**: Audio file storage with lifecycle policies
- **SQS**: Message queuing for async processing
- **CloudWatch**: Monitoring and logging
- **EC2**: Development environment hosting

#### 2. Development Tools
- **Node.js 22**: Runtime environment
- **Yarn 4.9.4**: Package management
- **TypeScript**: Type-safe development
- **Jest**: Testing framework
- **AWS CDK**: Infrastructure as code
- **GitHub Actions**: CI/CD platform
- **LocalStack**: Local AWS service emulation

#### 3. External Dependencies
- **GitHub**: Source control and CI/CD
- **AWS**: Cloud infrastructure
- **Docker**: Containerization
- **OIDC**: Authentication protocol

### Performance Characteristics

#### 1. Scalability
- **Serverless architecture** enables automatic scaling
- **Idempotency system** prevents duplicate processing
- **S3 lifecycle policies** manage storage costs
- **CloudWatch monitoring** tracks performance metrics

#### 2. Reliability
- **Idempotency guarantees** prevent data corruption
- **Comprehensive testing** with LocalStack
- **Health checks** monitor system status
- **Error handling** with proper logging

#### 3. Security
- **OIDC authentication** eliminates credential risks
- **JWT validation** for API access
- **S3 encryption** for data at rest
- **CloudWatch monitoring** for security events

### Maintenance Patterns

#### 1. Regular Updates
- **Dependency updates** through Yarn
- **Security patches** via automated scanning
- **Infrastructure updates** through CDK
- **Documentation updates** through context-aware system

#### 2. Monitoring and Alerting
- **Health checks** every 15 minutes
- **Performance monitoring** with CloudWatch
- **Security monitoring** with AWS Config
- **Automated alerts** for failures

#### 3. Documentation Maintenance
- **Living documentation** that updates with code
- **Context preservation** for AI agents
- **Human-readable guides** for operators
- **Decision tracking** for future reference

### Future Considerations

#### 1. Production Readiness
- **Production environment** setup with proper OIDC
- **Comprehensive monitoring** with dashboards
- **Performance optimization** for scale
- **Security hardening** for compliance

#### 2. Feature Development
- **Audio processing enhancements** for better quality
- **User interface** for better UX
- **API improvements** for better developer experience
- **Integration capabilities** for third-party services

#### 3. Operational Excellence
- **Automated testing** with comprehensive coverage
- **Deployment automation** with zero downtime
- **Monitoring and alerting** with proactive management
- **Documentation automation** with living updates
