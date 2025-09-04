# Environment Promotion Matrix

## Overview

**Date**: 2025-09-04  
**Status**: Comprehensive Matrix Created  
**Purpose**: Define the 5-environment promotion strategy for SoundBite

## Environment Definitions

### Environment 1: dev-localstack
**Full Name**: Development LocalStack  
**Infrastructure**: LocalStack (Local)  
**Application**: Local NestJS  
**Purpose**: Local development and testing  
**Access**: `localhost:3000`  
**Cost**: $0 (Free)  
**Performance**: Fast (Local)  
**Security**: Basic (Local)  
**Monitoring**: Basic (Local)  

**Key Characteristics**:
- No AWS costs
- Fast iteration
- Local data persistence
- Debug-friendly
- Offline development

**Use Cases**:
- Initial development
- Feature prototyping
- Local testing
- Debugging
- Learning and experimentation

### Environment 2: dev-aws
**Full Name**: Development AWS  
**Infrastructure**: AWS (Development)  
**Application**: Local NestJS  
**Purpose**: AWS service integration testing  
**Access**: `localhost:3000`  
**Cost**: ~$10/month  
**Performance**: Medium (AWS + Local)  
**Security**: Medium (AWS IAM)  
**Monitoring**: Medium (CloudWatch)  

**Key Characteristics**:
- Real AWS services
- Local application
- AWS cost monitoring
- Real data persistence
- AWS service testing

**Use Cases**:
- AWS service integration
- Real data testing
- AWS cost optimization
- Service configuration
- Pre-deployment validation

### Environment 3: dev-aws-deployed
**Full Name**: Development AWS Deployed  
**Infrastructure**: AWS (Development)  
**Application**: AWS Deployed  
**Purpose**: Pre-staging validation  
**Access**: `dev-api.soundbite.com`  
**Cost**: ~$50/month  
**Performance**: High (AWS)  
**Security**: High (AWS + OIDC)  
**Monitoring**: High (CloudWatch + Custom)  

**Key Characteristics**:
- AWS-deployed application
- Production-like environment
- Full AWS integration
- Performance testing
- Pre-staging validation

**Use Cases**:
- Integration testing
- Performance validation
- Pre-staging testing
- AWS deployment testing
- Production-like validation

### Environment 4: staging
**Full Name**: Staging  
**Infrastructure**: AWS (Staging)  
**Application**: AWS Deployed  
**Purpose**: Testing and validation  
**Access**: `staging-api.soundbite.com`  
**Cost**: ~$100/month  
**Performance**: High (AWS)  
**Security**: High (AWS + OIDC)  
**Monitoring**: High (CloudWatch + Custom)  

**Key Characteristics**:
- Production-like environment
- Full testing suite
- Performance monitoring
- Security validation
- User acceptance testing

**Use Cases**:
- User acceptance testing
- Performance testing
- Security testing
- Integration testing
- Pre-production validation

### Environment 5: production
**Full Name**: Production  
**Infrastructure**: AWS (Production)  
**Application**: AWS Deployed  
**Purpose**: Live production  
**Access**: `api.soundbite.com`  
**Cost**: ~$500/month  
**Performance**: High (AWS + Optimization)  
**Security**: High (AWS + OIDC + Compliance)  
**Monitoring**: Full (CloudWatch + Custom + Alerts)  

**Key Characteristics**:
- Live production environment
- Full monitoring and alerting
- High availability
- Security compliance
- Performance optimization

**Use Cases**:
- Live production
- Customer-facing
- Business operations
- Revenue generation
- Production monitoring

## Promotion Flow

### Linear Promotion Path
```
dev-localstack → dev-aws → dev-aws-deployed → staging → production
```

### Promotion Triggers
1. **dev-localstack → dev-aws**: Feature complete, AWS testing needed
2. **dev-aws → dev-aws-deployed**: AWS integration validated, deployment testing needed
3. **dev-aws-deployed → staging**: Deployment validated, pre-production testing needed
4. **staging → production**: All tests passed, production ready

### Promotion Gates

#### Gate 1: dev-localstack → dev-aws
**Prerequisites**:
- [ ] Feature development complete
- [ ] Local tests passing
- [ ] LocalStack integration working
- [ ] Code review approved

**Validation**:
- [ ] AWS credentials configured
- [ ] AWS services accessible
- [ ] Local application connects to AWS
- [ ] Basic functionality working

**Promotion Command**:
```bash
./scripts/promote-environment.sh dev-localstack dev-aws
```

#### Gate 2: dev-aws → dev-aws-deployed
**Prerequisites**:
- [ ] AWS integration working
- [ ] Real data testing complete
- [ ] Performance acceptable
- [ ] Security validation passed

**Validation**:
- [ ] AWS deployment successful
- [ ] Application responding
- [ ] All services connected
- [ ] Performance metrics acceptable

**Promotion Command**:
```bash
./scripts/promote-environment.sh dev-aws dev-aws-deployed
```

#### Gate 3: dev-aws-deployed → staging
**Prerequisites**:
- [ ] AWS deployment validated
- [ ] Integration tests passing
- [ ] Performance tests passing
- [ ] Security tests passing

**Validation**:
- [ ] Staging environment ready
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security compliance verified

**Promotion Command**:
```bash
./scripts/promote-environment.sh dev-aws-deployed staging
```

#### Gate 4: staging → production
**Prerequisites**:
- [ ] User acceptance testing complete
- [ ] Performance testing complete
- [ ] Security testing complete
- [ ] Business approval received

**Validation**:
- [ ] Production environment ready
- [ ] All tests passing
- [ ] Performance targets met
- [ ] Security compliance verified
- [ ] Monitoring configured

**Promotion Command**:
```bash
./scripts/promote-environment.sh staging production
```

## Environment Configuration Matrix

### Infrastructure Configuration

| Environment | AWS Account | Region | VPC | Subnets | Security Groups |
|-------------|-------------|--------|-----|---------|-----------------|
| dev-localstack | N/A | N/A | N/A | N/A | N/A |
| dev-aws | Dev | us-east-1 | Default | Public | Basic |
| dev-aws-deployed | Dev | us-east-1 | Default | Public | Enhanced |
| staging | Staging | us-east-1 | Custom | Private | High |
| production | Prod | us-east-1 | Custom | Private | Maximum |

### Application Configuration

| Environment | Node Env | Log Level | Debug | Metrics | Alerts |
|-------------|----------|-----------|-------|---------|--------|
| dev-localstack | development | debug | true | false | false |
| dev-aws | development | info | true | true | false |
| dev-aws-deployed | development | info | false | true | true |
| staging | staging | warn | false | true | true |
| production | production | error | false | true | true |

### Database Configuration

| Environment | DynamoDB | Backup | Encryption | TTL | Monitoring |
|-------------|----------|--------|------------|-----|------------|
| dev-localstack | LocalStack | No | No | 7 days | No |
| dev-aws | Dev Table | No | Yes | 30 days | Basic |
| dev-aws-deployed | Dev Table | Yes | Yes | 30 days | Medium |
| staging | Staging Table | Yes | Yes | 90 days | High |
| production | Prod Table | Yes | Yes | 365 days | Full |

### Storage Configuration

| Environment | S3 Bucket | Lifecycle | Encryption | Versioning | Monitoring |
|-------------|-----------|-----------|------------|------------|------------|
| dev-localstack | LocalStack | No | No | No | No |
| dev-aws | Dev Bucket | Basic | Yes | No | Basic |
| dev-aws-deployed | Dev Bucket | Basic | Yes | Yes | Medium |
| staging | Staging Bucket | Standard | Yes | Yes | High |
| production | Prod Bucket | Advanced | Yes | Yes | Full |

### Queue Configuration

| Environment | SQS Queue | DLQ | Visibility | Retention | Monitoring |
|-------------|-----------|-----|------------|-----------|------------|
| dev-localstack | LocalStack | No | 30s | 4 days | No |
| dev-aws | Dev Queue | Yes | 30s | 14 days | Basic |
| dev-aws-deployed | Dev Queue | Yes | 60s | 14 days | Medium |
| staging | Staging Queue | Yes | 60s | 14 days | High |
| production | Prod Queue | Yes | 300s | 14 days | Full |

## Monitoring Configuration

### Health Checks

| Environment | Frequency | Timeout | Retries | Endpoints |
|-------------|-----------|---------|---------|-----------|
| dev-localstack | Manual | 5s | 3 | /health |
| dev-aws | 5min | 10s | 3 | /health, /aws |
| dev-aws-deployed | 2min | 10s | 5 | /health, /aws, /metrics |
| staging | 1min | 10s | 5 | /health, /aws, /metrics, /status |
| production | 30s | 5s | 3 | /health, /aws, /metrics, /status, /ready |

### Alerting Configuration

| Environment | Alerts | Channels | Escalation | Response Time |
|-------------|--------|----------|------------|---------------|
| dev-localstack | None | N/A | N/A | N/A |
| dev-aws | Basic | Email | Manual | 1 hour |
| dev-aws-deployed | Medium | Email, Slack | Manual | 30 min |
| staging | High | Email, Slack, PagerDuty | Auto | 15 min |
| production | Critical | Email, Slack, PagerDuty, Phone | Auto | 5 min |

## Security Configuration

### IAM Roles

| Environment | Role Name | Permissions | MFA | Session Duration |
|-------------|-----------|-------------|-----|------------------|
| dev-localstack | N/A | N/A | N/A | N/A |
| dev-aws | DevRole | Basic | No | 1 hour |
| dev-aws-deployed | DevDeployedRole | Enhanced | No | 1 hour |
| staging | StagingRole | High | Yes | 30 min |
| production | ProdRole | Maximum | Yes | 15 min |

### Secrets Management

| Environment | Secrets Store | Rotation | Encryption | Access Control |
|-------------|---------------|-----------|------------|----------------|
| dev-localstack | Local | No | No | Local |
| dev-aws | AWS Secrets Manager | Manual | Yes | IAM |
| dev-aws-deployed | AWS Secrets Manager | Auto | Yes | IAM |
| staging | AWS Secrets Manager | Auto | Yes | IAM + MFA |
| production | AWS Secrets Manager | Auto | Yes | IAM + MFA + Audit |

## Cost Analysis

### Monthly Cost Estimates

| Environment | Compute | Storage | Database | Queue | Monitoring | Total |
|-------------|---------|---------|----------|-------|------------|-------|
| dev-localstack | $0 | $0 | $0 | $0 | $0 | $0 |
| dev-aws | $10 | $5 | $5 | $2 | $3 | $25 |
| dev-aws-deployed | $30 | $10 | $10 | $5 | $10 | $65 |
| staging | $50 | $20 | $20 | $10 | $20 | $120 |
| production | $200 | $50 | $100 | $20 | $50 | $420 |

### Cost Optimization Strategies

1. **dev-localstack**: Free development
2. **dev-aws**: Use free tier limits
3. **dev-aws-deployed**: Optimize for testing
4. **staging**: Use reserved instances
5. **production**: Use spot instances + reserved instances

## Rollback Strategy

### Rollback Triggers

1. **Performance degradation** > 20%
2. **Error rate** > 5%
3. **Security incident** detected
4. **Business impact** identified
5. **Manual rollback** requested

### Rollback Procedures

#### Immediate Rollback (0-5 minutes)
- **production → staging**: Automatic rollback
- **staging → dev-aws-deployed**: Automatic rollback
- **dev-aws-deployed → dev-aws**: Manual rollback
- **dev-aws → dev-localstack**: Manual rollback

#### Rollback Commands
```bash
# Rollback to previous environment
./scripts/rollback-environment.sh production staging
./scripts/rollback-environment.sh staging dev-aws-deployed
./scripts/rollback-environment.sh dev-aws-deployed dev-aws
./scripts/rollback-environment.sh dev-aws dev-localstack
```

## Success Metrics

### Environment Health Metrics

| Metric | dev-localstack | dev-aws | dev-aws-deployed | staging | production |
|--------|----------------|---------|------------------|---------|------------|
| Uptime | 95% | 99% | 99.5% | 99.9% | 99.99% |
| Response Time | < 100ms | < 200ms | < 300ms | < 500ms | < 1000ms |
| Error Rate | < 5% | < 2% | < 1% | < 0.5% | < 0.1% |
| Availability | 95% | 99% | 99.5% | 99.9% | 99.99% |

### Promotion Success Metrics

- **Promotion Success Rate**: > 95%
- **Promotion Time**: < 30 minutes
- **Rollback Time**: < 10 minutes
- **Validation Time**: < 15 minutes

### Cost Efficiency Metrics

- **Cost per Environment**: Within budget
- **Resource Utilization**: > 70%
- **Waste Reduction**: < 10%
- **Optimization Savings**: > 20%

## Implementation Checklist

### Phase 1: Environment Setup
- [ ] Configure dev-localstack environment
- [ ] Configure dev-aws environment
- [ ] Configure dev-aws-deployed environment
- [ ] Configure staging environment
- [ ] Configure production environment

### Phase 2: Promotion Automation
- [ ] Create promotion scripts
- [ ] Implement validation gates
- [ ] Add rollback procedures
- [ ] Create monitoring dashboards

### Phase 3: Testing and Validation
- [ ] Test all environments
- [ ] Validate promotion flow
- [ ] Test rollback procedures
- [ ] Performance testing

### Phase 4: Documentation and Training
- [ ] Create environment documentation
- [ ] Train team on promotion process
- [ ] Create troubleshooting guides
- [ ] Update runbooks

### Phase 5: Monitoring and Optimization
- [ ] Implement monitoring dashboards
- [ ] Set up alerting
- [ ] Optimize performance
- [ ] Cost optimization

## Conclusion

This environment promotion matrix provides a comprehensive framework for managing the 5-environment deployment strategy. The matrix ensures proper promotion flow, validation gates, and rollback procedures while maintaining security, performance, and cost efficiency across all environments.

**Key Benefits**:
- Clear environment definitions
- Structured promotion flow
- Comprehensive validation
- Automated rollback procedures
- Cost optimization strategies
- Performance monitoring
- Security compliance

**Next Steps**:
1. Implement the promotion scripts
2. Configure environment-specific monitoring
3. Set up validation gates
4. Create rollback procedures
5. Train the team on the new process
