# 🚀 SoundBite CI/CD Guide

## Overview

This guide covers the complete CI/CD pipeline for SoundBite, including automated testing, building, deployment, and environment promotion.

## Pipeline Architecture

### Branch Strategy
- **`dev`** → Development Environment (EC2)
- **`staging`** → Staging Environment (EC2) 
- **`master`** → Production Environment (EC2)

### Workflow Files (Implemented)
1. **`dev-ci.yml`** – Dev CI (lint, test, build, LocalStack probe)
2. **`staging-production-ci.yml`** – CI for staging/master (lint, test, build, Docker run health)
3. **`staging-production-cd.yml`** – CD to staging/master (SSM → EC2, health verification)
4. **`promote-environment.yml`** – Manual environment promotion (tag re-use)
5. **`rollback-environment.yml`** – Manual rollback
6. **`monitoring.yml`** – Scheduled and manual health/security checks

## CI/CD Pipeline Stages

### 1. Test Stage
- **Linting**: ESLint with TypeScript rules
- **Unit Tests**: Jest with coverage
- **Integration Tests**: LocalStack + AWS services
- **Security Scan**: Trivy vulnerability scanning

### 2. Build Stage
- **Application Build**: NestJS compilation
- **Docker Image Build**: Environment-specific images
- **ECR Push**: Automated image publishing

### 3. Deploy Stage
- **Infrastructure**: CDK deployment
- **Application**: EC2 deployment with Docker
- **Health Checks**: Automated verification

## Environment Configuration

### Development Environment
- **Trigger**: Push to `dev` branch
- **Dockerfile**: N/A (build + runtime checks in CI with `Dockerfile.dev` where applicable)
- **Infrastructure**: `SoundBite-development-*` (prefix: `dev`)

### Staging Environment
- **Trigger**: Push to `staging` branch
- **Dockerfile**: `Dockerfile` (shared with production)
- **ECR Tag**: `staging`
- **Infrastructure**: `SoundBite-staging-*` (prefix: `staging`)

### Production Environment
- **Trigger**: Push to `master` branch
- **Dockerfile**: `Dockerfile` (shared with staging)
- **ECR Tag**: `production`
- **Infrastructure**: `SoundBite-production-*` (prefix: `prod`)

**Note**: Staging and Production use **identical infrastructure** with only different naming prefixes (`staging` vs `prod`). They share the same Dockerfile and application code.

## Manual Operations

### Environment Promotion
```bash
# Promote from staging to production
# Go to GitHub Actions → Promote Environment
# Select: staging → production
# Confirm: Type "PROMOTE"
```

### Rollback
```bash
# Rollback any environment
# Go to GitHub Actions → Rollback Environment
# Select environment and commit hash
# Confirm: Type "ROLLBACK"
```

## Local Development

### Available Scripts
```bash
# Deploy to specific environment
yarn deploy:dev      # Development
yarn deploy:staging  # Staging  
yarn deploy:prod     # Production
yarn deploy:all      # All environments

# Destroy environments
yarn destroy:dev     # Development
yarn destroy:staging # Staging
yarn destroy:prod    # Production

# Run tests
yarn test           # Unit tests
yarn test:ci        # CI tests with coverage
yarn test:integration # Integration tests

# Linting and formatting
yarn lint           # ESLint
yarn format         # Prettier
```

## Monitoring and Alerts

### Health Checks
- **Development**: `http://<instance-ip>/health`
- **Staging**: `http://<instance-ip>/staging/`
- **Production**: `http://<instance-ip>/prod/`

### CloudWatch Monitoring
- **Instance Status**: EC2 metrics
- **Application Logs**: CloudWatch Logs
- **Performance**: Custom metrics

## Troubleshooting

### Common Issues

#### 1. Docker Build Failures
```bash
# Check Dockerfile syntax
docker build -f Dockerfile.staging .

# Check ECR permissions
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 762233763891.dkr.ecr.us-east-1.amazonaws.com
```

#### 2. CDK Deployment Failures
```bash
# Check CDK context
cd cdk && npx cdk context

# Deploy with verbose output
CDK_ENVIRONMENT=development npx cdk deploy --all --verbose
```

#### 3. EC2 Instance Issues
```bash
# Check instance status
aws ec2 describe-instances --instance-ids <instance-id>

# Check user data logs
aws ssm send-command --instance-ids <instance-id> --document-name "AWS-RunShellScript" --parameters 'commands=["cat /var/log/user-data.log"]'
```

### Debug Commands
```bash
# Check ECR images
aws ecr list-images --repository-name soundbite-development-api

# Check CloudFormation stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Check EC2 instances
aws ec2 describe-instances --filters "Name=tag:Name,Values=*SoundBite*"
```

## Security Considerations

### OIDC Authentication
- **Role**: `GitHubActionsRole`
- **Permissions**: ECR, EC2, CloudFormation, S3, DynamoDB, SQS
- **Region**: `us-east-1`

### Secrets Management
- **AWS Credentials**: OIDC-based (no stored secrets)
- **ECR Access**: Automatic via OIDC
- **Environment Variables**: GitHub Actions secrets

## Performance Optimization

### Build Optimization
- **Docker Layer Caching**: GitHub Actions cache
- **Yarn Caching**: Node modules cache
- **CDK Synthesis**: Incremental builds

### Deployment Optimization
- **Parallel Jobs**: Test, build, security scan
- **Conditional Deployments**: Only on push events
- **Health Check Timeouts**: 30-second verification

## Cost Management

### Estimated Monthly Costs
- **Development**: ~$50/month
- **Staging**: ~$50/month  
- **Production**: ~$100/month
- **CI/CD Pipeline**: ~$20/month
- **Total**: ~$220/month

### Cost Optimization
- **EC2 Instance Types**: t3.micro for dev/staging
- **Auto-scaling**: Based on demand
- **Resource Cleanup**: Automated cleanup of unused resources

## Best Practices

### Code Quality
1. **Pre-commit Hooks**: Linting and formatting
2. **Conventional Commits**: Standardized commit messages
3. **Code Reviews**: Required for all changes
4. **Test Coverage**: Minimum 80% coverage

### Deployment Safety
1. **Blue-Green Deployments**: Zero-downtime deployments
2. **Health Checks**: Automated verification
3. **Rollback Procedures**: Quick recovery
4. **Monitoring**: Real-time alerts

### Security
1. **Least Privilege**: Minimal required permissions
2. **Regular Updates**: Dependencies and base images
3. **Vulnerability Scanning**: Automated security checks
4. **Access Control**: Environment-specific access

## Support and Maintenance

### Regular Tasks
- **Weekly**: Review pipeline performance
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **As Needed**: Troubleshoot issues

### Contact Information
- **Primary**: Development Team
- **Escalation**: DevOps Team
- **Documentation**: This guide and AI docs

## Changelog

### v1.0.0 (2025-09-19)
- Initial CI/CD pipeline implementation
- Multi-environment support
- Automated Docker image building and pushing
- Environment promotion workflows
- Rollback capabilities
- Comprehensive monitoring and alerting
