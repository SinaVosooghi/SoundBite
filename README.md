# 🎵 SoundBite - Modern CDK Architecture

A modern, scalable audio processing application built with **individual service stacks** for better observability, debugging, and deployment control.

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- Docker
- AWS CLI configured
- Yarn package manager

### Local Development
```bash
# Start local development (requires LocalStack for AWS services)
./scripts/soundbite.sh dev --local

# Start with Docker
./scripts/soundbite.sh dev --docker

# Start full stack
./scripts/soundbite.sh dev --full
```

**Note**: Local development requires LocalStack to be running for AWS service emulation. The script will automatically start LocalStack if it's not running.

### Production Deployment
```bash
# Full deployment (build + deploy)
./scripts/soundbite.sh deploy --full

# Infrastructure only
./scripts/soundbite.sh deploy --infra-only

# Clean deployment (destroy + recreate)
./scripts/soundbite.sh deploy --clean
```

### 🧪 Testing
```bash
# Run CDK unit tests
./scripts/soundbite.sh test unit

# Run automated deployment tests
./scripts/soundbite.sh test-deploy scenario1  # Full destroy & recreate
./scripts/soundbite.sh test-deploy scenario2  # Single service test
./scripts/soundbite.sh test-deploy scenario3  # Service modification test
./scripts/soundbite.sh test-deploy all        # All scenarios
```

## 🧪 Testing & Validation

### CDK v2 Testing
Our modern CDK architecture includes comprehensive testing using official AWS CDK v2 tools:

#### Unit Tests
```bash
# Run all CDK unit tests
./scripts/soundbite.sh test unit

# Run specific test file
cd cdk && npx jest test/unit/database-stack-v2.test.ts

# Run with coverage
cd cdk && npx jest test/unit/ --coverage
```

#### Security Testing
```bash
# Run security compliance checks
./scripts/soundbite.sh test security

# Run cdk-nag directly
cd cdk && npx cdk synth && npx cdk-nag cdk.out/*.template.json
```

#### Test Results
```bash
✓ creates DynamoDB table with correct properties (403 ms)
✓ creates CloudWatch alarms for monitoring (45 ms)
✓ exports table name and ARN (44 ms)
✓ applies correct tags to all resources (36 ms)
✓ has correct number of resources (43 ms)
✓ can synthesize without errors (46 ms)
✓ has correct stack properties (7 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        10.646 s
```

### 🤖 Automated Deployment Testing
Comprehensive automated testing scenarios for deployment validation:

#### Scenario 1: Full Infrastructure Test
```bash
./scripts/soundbite.sh test-deploy scenario1
```
- **Step 1**: Destroy all existing infrastructure
- **Step 2**: Deploy all infrastructure from scratch
- **Verification**: Each stack verified after deployment

#### Scenario 2: Single Service Test
```bash
./scripts/automated-deploy-test.sh scenario2
```
- **Step 1**: Destroy specific service (e.g., API stack)
- **Step 2**: Deploy only that service
- **Verification**: Service resources verified

#### Scenario 3: Service Modification Test
```bash
./scripts/automated-deploy-test.sh scenario3
```
- **Step 1**: Modify service configuration
- **Step 2**: Deploy modification
- **Step 3**: Revert modification
- **Step 4**: Deploy reversion
- **Verification**: Changes verified at each step

#### Run All Scenarios
```bash
./scripts/automated-deploy-test.sh all
```

### 🔍 Testing Features

#### Smart Stack Management
- **Dependency-aware ordering**: Stacks deployed/destroyed in correct order
- **Wait for completion**: Each operation waits for CloudFormation completion
- **Error handling**: Comprehensive error detection and reporting

#### Resource Verification
- **DynamoDB**: Table existence and properties
- **S3**: Bucket existence and access
- **SQS**: Queue existence and attributes
- **ECR**: Repository existence
- **EC2**: Instance existence and status

#### Real-time Monitoring
- **Stack status tracking**: Real-time CloudFormation status monitoring
- **Progress reporting**: Clear progress indicators
- **Detailed logging**: Comprehensive operation logs

## 🏗️ Modern Architecture

### Individual Service Stacks
Each AWS service is deployed as an independent stack for better control and observability:

- **📊 Database Stack**: DynamoDB with TTL and GSI
- **🗄️ Storage Stack**: S3 with lifecycle policies  
- **📨 Queue Stack**: SQS with dead letter queue
- **⚙️ Compute Stack**: Lambda + ECR repository
- **🌐 API Stack**: EC2 with Docker containerization

### Deployment Order
```
Database → Storage → Queue → Compute → API
```

## 🛠️ Development Tools

### CDK Management
```bash
# Deploy all stacks
./scripts/cdk-deploy.sh deploy all

# Deploy specific stack
./scripts/cdk-deploy.sh deploy database

# Show stack status
./scripts/cdk-deploy.sh status

# Destroy specific stack
./scripts/cdk-deploy.sh destroy api
```

### System Management
```bash
# Check system status
./scripts/soundbite.sh status

# View logs
./scripts/soundbite.sh logs

# Clean up resources
./scripts/soundbite.sh clean

# Destroy infrastructure
./scripts/soundbite.sh destroy --all
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

#### Infrastructure Deployment (`.github/workflows/deploy.yml`)
- **Triggers**: Push to main/develop, PR, manual dispatch
- **Environments**: Staging (develop), Production (main)
- **Features**:
  - Validation and security checks
  - Individual stack deployment
  - Health checks and monitoring
  - Artifact management

#### Docker Image Pipeline (`.github/workflows/docker.yml`)
- **Triggers**: Code changes, manual dispatch
- **Features**:
  - Multi-stage builds with caching
  - Security scanning with Trivy
  - ECR push with metadata
  - EC2 instance updates

#### Testing Pipeline (`.github/workflows/test.yml`)
- **Triggers**: Push, PR, manual dispatch
- **Features**:
  - CDK unit tests
  - Security compliance checks
  - Automated deployment tests
  - Test coverage reporting

## 📊 Monitoring & Observability

### CloudWatch Alarms
Each stack includes comprehensive monitoring:
- **Database**: Read/Write throttling, capacity monitoring
- **Storage**: Bucket size, object count monitoring
- **Queue**: Queue depth, message age, DLQ monitoring
- **Compute**: Lambda errors, duration, throttles
- **API**: CPU, memory, network monitoring

### Resource Tagging
All resources are tagged with:
- `Project: SoundBite`
- `Environment: {staging|production}`
- `ManagedBy: CDK`
- `Service: {Database|Storage|Queue|Compute|API}`

## 🔒 Security Features

- **Least Privilege Access**: IAM roles with minimal permissions
- **Encryption**: S3, DynamoDB, ECR encryption enabled
- **Network Security**: Security groups with specific port access
- **Monitoring**: CloudWatch alarms for security events
- **Image Scanning**: ECR image scanning on push

## 📁 Project Structure

```
├── cdk/                          # CDK Infrastructure
│   ├── bin/
│   │   └── soundbite-app.ts      # Main CDK application
│   ├── lib/
│   │   ├── database-stack.ts     # DynamoDB stack
│   │   ├── storage-stack.ts      # S3 stack
│   │   ├── queue-stack.ts        # SQS stack
│   │   ├── compute-stack.ts      # Lambda + ECR stack
│   │   └── api-stack.ts          # EC2 stack
│   ├── test/                     # CDK Tests
│   │   ├── unit/
│   │   │   └── database-stack-v2.test.ts
│   │   └── setup.ts
│   └── cdk.json
├── .github/workflows/            # GitHub Actions
│   ├── deploy.yml                # Infrastructure deployment
│   ├── docker.yml                # Docker image pipeline
│   └── test.yml                  # Testing pipeline
├── scripts/                      # Organized script structure
│   ├── soundbite.sh              # Main management script
│   ├── core/                     # Core functionality
│   │   ├── dev.sh                # Development environment
│   │   ├── deploy.sh             # Production deployment
│   │   ├── destroy.sh            # Infrastructure cleanup
│   │   ├── docker-build.sh       # Docker image building
│   │   └── cdk-deploy.sh         # CDK deployment
│   ├── utils/                    # Utility scripts
│   │   ├── status.sh             # System status
│   │   ├── logs.sh               # Log viewing
│   │   ├── clean.sh              # Resource cleanup
│   │   └── bootstrap-localstack.sh # LocalStack setup
│   ├── testing/                  # Testing scripts
│   │   ├── test-cdk.sh           # CDK testing
│   │   ├── automated-deploy-test.sh # Deployment tests
│   │   ├── test-cdk-architecture.sh # Architecture tests
│   │   └── simple-test.sh        # Simple tests
│   └── lib/                      # Shared libraries
│       ├── common.sh             # Common utilities
│       ├── docker.sh             # Docker operations
│       └── aws.sh                # AWS operations
├── docker/                       # Docker configurations
│   ├── docker-compose.yml        # Base configuration
│   ├── docker-compose.dev.yml    # Development overrides
│   └── docker-compose.prod.yml   # Production overrides
├── docs/                         # Documentation
│   ├── MODERN_CDK_ARCHITECTURE.md
│   ├── AUTOMATED_DEPLOYMENT_TESTING.md
│   ├── CDK_TESTING_BEST_PRACTICES.md
│   ├── DEPLOYMENT.md
│   └── DEVELOPMENT.md
├── Dockerfile                    # Production Dockerfile
├── Dockerfile.dev                # Development Dockerfile
└── Dockerfile.dev-fast           # Fast development builds
```

## 🛠️ Script Organization

The project uses a clean, organized script structure for better maintainability:

### Script Categories
- **`scripts/soundbite.sh`**: Main entry point for all operations
- **`scripts/core/`**: Core functionality (dev, deploy, destroy, build)
- **`scripts/utils/`**: Utility scripts (status, logs, clean)
- **`scripts/testing/`**: Testing scripts (CDK tests, deployment tests)
- **`scripts/lib/`**: Shared libraries (common utilities, Docker, AWS operations)

### Usage Examples
```bash
# All commands go through the main script
./scripts/soundbite.sh dev --local      # Development
./scripts/soundbite.sh deploy --full    # Deployment
./scripts/soundbite.sh test unit        # Testing
./scripts/soundbite.sh status           # Status check
./scripts/soundbite.sh help             # Show all commands
```

## 🚀 Performance Optimizations

### Docker Build Optimization
- Multi-stage builds with BuildKit
- Layer caching and optimization
- Parallel builds in CI/CD
- Fast development builds with `Dockerfile.dev-fast`

### CDK Deployment Optimization
- Individual stack deployment
- Dependency-based ordering
- Incremental updates
- Parallel stack operations

### Resource Optimization
- DynamoDB on-demand billing
- S3 lifecycle policies for cost control
- Lambda concurrency limits
- EC2 instance sizing

## 🔧 Troubleshooting

### Common Issues

#### Stack Deployment Failures
```bash
# Check stack status
./scripts/cdk-deploy.sh status

# View CloudFormation events
aws cloudformation describe-stack-events --stack-name SoundBite-Database
```

#### EC2 Container Issues
```bash
# SSH to instance
ssh ec2-user@<instance-ip>

# Check container status
docker ps
docker logs soundbite-api

# Check user data logs
sudo cat /var/log/cloud-init-output.log
```

#### Docker Build Issues
```bash
# Test local build
./scripts/soundbite.sh build --local

# Check ECR repository
aws ecr describe-repositories --repository-names soundbite-staging-api
```

#### Testing Issues
```bash
# Check CDK test status
./scripts/test-cdk.sh unit

# Check automated deployment test prerequisites
./scripts/automated-deploy-test.sh help

# Verify AWS credentials
aws sts get-caller-identity
```

## 📚 Documentation

- **[Modern CDK Architecture](docs/MODERN_CDK_ARCHITECTURE.md)** - Detailed architecture documentation
- **[Automated Deployment Testing](docs/AUTOMATED_DEPLOYMENT_TESTING.md)** - Testing scenarios and validation
- **[CDK Testing Best Practices](docs/CDK_TESTING_BEST_PRACTICES.md)** - Official AWS testing tools
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Deployment workflows and procedures
- **[Development Guide](docs/DEVELOPMENT.md)** - Local development setup

## 🎯 Best Practices

### 1. **Always Test Before Deploying**
- Run CDK unit tests: `./scripts/test-cdk.sh unit`
- Run automated deployment tests: `./scripts/automated-deploy-test.sh all`
- Validate security compliance: `./scripts/test-cdk.sh security`

### 2. **Use Individual Stacks**
- Deploy only what you need
- Test changes in isolation
- Monitor service-specific metrics

### 3. **Leverage GitHub Actions**
- Automated testing and validation
- Environment-specific deployments
- Security scanning and compliance

### 4. **Monitor Everything**
- Set up CloudWatch alarms
- Use structured logging
- Track performance metrics

### 5. **Security First**
- Least privilege access
- Encryption everywhere
- Regular security audits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **Test thoroughly**:
   ```bash
   ./scripts/test-cdk.sh all
   ./scripts/automated-deploy-test.sh all
   ```
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with modern AWS CDK best practices, featuring individual service stacks for optimal observability, deployment control, and comprehensive testing.**
