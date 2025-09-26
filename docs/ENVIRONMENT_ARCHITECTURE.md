# 🏗️ SoundBite Environment Architecture

## Environment Strategy Overview

SoundBite uses a **unified infrastructure approach** where staging and production environments are **identical** with only different naming prefixes and configuration values.

## Environment Configuration

### Development Environment
- **CDK Prefix**: `dev`
- **Ports**:
  - LocalStack mode: 3000 (local app + LocalStack)
  - AWS mode: 3001 (local app + real AWS)
- **Log Level**: `debug`
- **Features**: `['basic', 'debug', 'local']`
- **Dockerfile**: `Dockerfile.dev`
- **Infrastructure**: `SoundBite-development-*`

### Staging Environment
- **CDK Prefix**: `staging`
- **Ports**:
  - App container: 3000
  - EC2 mapping: 3001/3002 as configured by CD workflow
- **Log Level**: `info`
- **Features**: `['basic', 'monitoring', 'testing']`
- **Dockerfile**: `Dockerfile` (shared with production)
- **Infrastructure**: `SoundBite-staging-*`

### Production Environment
- **CDK Prefix**: `prod`
- **Port**: 3003
- **Domain**: `api.soundbite.local`
- **Log Level**: `warn`
- **Features**: `['full', 'monitoring', 'backup', 'scaling']`
- **Dockerfile**: `Dockerfile.staging` (same as staging)
- **Infrastructure**: `SoundBite-production-*`

## Key Architectural Principles

### 1. **Identical Infrastructure**
Staging and Production use **exactly the same**:
- CDK stack structure
- AWS resource types
- Application code
- Docker image (same Dockerfile)
- Infrastructure patterns

### 2. **Configuration-Driven Differences**
Only differences are in configuration:
- **Naming prefixes**: `staging` vs `prod`
- **Resource names**: `SoundBite-staging-*` vs `SoundBite-production-*`
- **Environment variables**: Different log levels, ports, domains
- **Feature flags**: Different feature sets

### 3. **Unified Deployment Strategy**
- **Same Docker image** for staging and production
- **Same CDK templates** with different parameters
- **Same application code** with environment-specific config
- **Same monitoring and alerting** patterns

## CDK Implementation

### Environment Configuration
```typescript
// cdk/config/environments.ts
export const environments = {
  staging: {
    name: 'staging',
    prefix: 'staging',  // ← Only difference
    port: 3002,
    logLevel: 'info',
    // ... other config
  },
  production: {
    name: 'production', 
    prefix: 'prod',     // ← Only difference
    port: 3003,
    logLevel: 'warn',
    // ... other config
  }
}
```

### CDK Stack Naming
```typescript
// Both environments use identical stack structure:
// Staging:  SoundBite-staging-API
//          SoundBite-staging-Database
//          SoundBite-staging-Storage
//          SoundBite-staging-Queue
//          SoundBite-staging-Compute

// Production: SoundBite-production-API
//             SoundBite-production-Database
//             SoundBite-production-Storage
//             SoundBite-production-Queue
//             SoundBite-production-Compute
```

## CI/CD Implications

### Docker Image Strategy
- **Staging**: Builds and pushes `staging` tag
- **Production**: Uses same image, tags as `production`
- **Promotion**: Simply re-tags staging image as production

### Deployment Process
1. **Staging**: Deploys with `staging` prefix
2. **Production**: Deploys with `prod` prefix
3. **Same infrastructure**: Identical AWS resources
4. **Different configuration**: Environment-specific settings

### Benefits of This Approach

#### 1. **Consistency**
- Staging truly represents production
- No surprises when promoting
- Identical behavior across environments

#### 2. **Simplicity**
- Single Dockerfile for staging/production
- Single CDK template with parameters
- Unified monitoring and alerting

#### 3. **Reliability**
- Proven infrastructure in staging
- Same code path in production
- Reduced deployment complexity

#### 4. **Cost Efficiency**
- No duplicate infrastructure patterns
- Shared knowledge and tooling
- Simplified maintenance

## Environment Promotion

### Promotion Process
1. **Code tested** in staging environment
2. **Same Docker image** tagged for production
3. **Same CDK deployment** with `prod` prefix
4. **Identical infrastructure** created
5. **Production configuration** applied

### Rollback Process
1. **Previous image** re-tagged
2. **Same CDK deployment** with `prod` prefix
3. **Identical infrastructure** restored
4. **Previous configuration** applied

## Monitoring and Observability

### Unified Monitoring
- **Same CloudWatch dashboards** (with different prefixes)
- **Same alerting rules** (with different thresholds)
- **Same log patterns** (with different log levels)
- **Same metrics** (with different namespaces)

### Environment-Specific Configuration
- **Log levels**: `info` (staging) vs `warn` (production)
- **Retention**: 30 days (staging) vs 90 days (production)
- **Backup**: Disabled (staging) vs Enabled (production)
- **Scaling**: Basic (staging) vs Full (production)

## Best Practices

### 1. **Configuration Management**
- Use environment variables for differences
- Keep infrastructure code identical
- Separate configuration from code

### 2. **Testing Strategy**
- Test in staging with production-like data
- Validate configuration changes
- Test promotion process regularly

### 3. **Deployment Safety**
- Always test in staging first
- Use blue-green deployment patterns
- Implement proper rollback procedures

### 4. **Monitoring**
- Monitor both environments identically
- Set appropriate thresholds per environment
- Track configuration drift

## Troubleshooting

### Common Issues
1. **Configuration Mismatch**: Ensure environment configs are correct
2. **Naming Conflicts**: Verify prefix usage in CDK
3. **Resource Limits**: Check AWS quotas for both environments
4. **Promotion Failures**: Validate image tagging and deployment

### Debug Commands
```bash
# Check environment configuration
cd cdk && npx cdk context

# Deploy specific environment
CDK_ENVIRONMENT=staging npx cdk deploy --all
CDK_ENVIRONMENT=production npx cdk deploy --all

# Check resource naming
aws cloudformation list-stacks --query 'StackSummaries[?contains(StackName, `SoundBite-staging`)]'
aws cloudformation list-stacks --query 'StackSummaries[?contains(StackName, `SoundBite-production`)]'
```

## Conclusion

This unified approach ensures that staging and production environments are truly identical, providing confidence in the promotion process and reducing operational complexity. The only differences are in naming prefixes and configuration values, making the system predictable and maintainable.
