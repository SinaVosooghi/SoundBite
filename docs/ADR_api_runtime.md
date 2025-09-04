# Architecture Decision Record: API Runtime Selection

## Status
Accepted (with planned migration path)

## Date
2023-09-15

## Context
The SoundBite service requires a reliable, scalable runtime environment for the NestJS API component. This component handles user requests, validates input, enqueues jobs to SQS, and provides status information for text-to-speech conversion jobs.

We needed to select an appropriate AWS runtime environment that balances:
- Operational complexity
- Cost efficiency
- Performance characteristics
- Development velocity
- Deployment simplicity

## Options Considered

### Option 1: EC2-hosted Container (Current Implementation)
**Description**: Deploy the NestJS application as a Docker container running on EC2 instances.

**Pros**:
- Full control over the runtime environment
- Predictable performance characteristics
- No cold start issues
- Familiar deployment model for the team
- Direct access to the instance for debugging

**Cons**:
- Higher operational overhead (patching, scaling, monitoring)
- Less efficient resource utilization
- Higher baseline costs
- Manual scaling configuration required

### Option 2: ECS Fargate
**Description**: Deploy the NestJS application as a Docker container managed by ECS Fargate.

**Pros**:
- No server management required
- Automatic scaling based on demand
- Pay-per-use pricing model
- Simplified deployment and management
- Better resource utilization

**Cons**:
- Less control over the underlying infrastructure
- Potential cold start issues for infrequent traffic
- More complex networking setup for VPC integration
- Slightly higher per-request cost compared to EC2

### Option 3: Lambda + API Gateway
**Description**: Refactor the NestJS application to run as Lambda functions behind API Gateway.

**Pros**:
- Fully serverless architecture
- Automatic scaling to zero when not in use
- Pay-only-for-what-you-use pricing
- Simplified deployment and infrastructure
- Integrated with API Gateway features (throttling, caching)

**Cons**:
- 29-second timeout limitation for API Gateway
- Cold start latency for infrequent traffic
- Less suitable for long-running operations
- More complex local development setup
- Requires significant application refactoring

## Decision
We initially selected **Option 1: EC2-hosted Container** for the following reasons:

1. **Team Familiarity**: The team has extensive experience with EC2 and container deployments
2. **Time Constraints**: Faster initial implementation with the familiar model
3. **Debugging Needs**: Early development benefits from direct server access
4. **Performance Predictability**: Consistent performance without cold starts

However, we acknowledge that this is not the most cost-effective or operationally efficient solution for the long term. Therefore, we have decided on a **planned migration to Option 2: ECS Fargate** in the next development cycle.

## Migration Plan

The migration from EC2 to ECS Fargate will proceed as follows:

1. **Phase 1: Preparation** (Sprint 23)
   - Create ECS cluster and task definitions
   - Update CDK infrastructure to support both deployment models
   - Ensure container is optimized for Fargate environment

2. **Phase 2: Parallel Deployment** (Sprint 24)
   - Deploy the application to both EC2 and Fargate
   - Validate performance and functionality in Fargate
   - Implement monitoring and alerting for Fargate deployment

3. **Phase 3: Traffic Shifting** (Sprint 25)
   - Gradually shift traffic from EC2 to Fargate using DNS
   - Monitor for any issues or performance differences
   - Maintain EC2 capability for immediate rollback if needed

4. **Phase 4: Completion** (Sprint 26)
   - Complete migration to Fargate
   - Decommission EC2 resources
   - Document lessons learned and performance characteristics

## Consequences

### Positive
- Initial deployment using familiar EC2 model accelerated time-to-market
- Planned migration to Fargate will reduce operational overhead
- Phased approach minimizes risk while improving infrastructure
- Both models use the same container, simplifying the migration

### Negative
- Temporary higher costs during parallel operation
- Engineering effort required for migration
- Potential for subtle differences in behavior between environments

### Neutral
- Need to maintain deployment capabilities for both models during transition
- Additional monitoring required during migration

## Alternatives Not Chosen

We decided against **Option 3: Lambda + API Gateway** for the following reasons:

1. **Application Architecture**: The NestJS application is not designed for the Lambda execution model
2. **Development Complexity**: Significant refactoring would be required
3. **Timeout Limitations**: Some operations might approach or exceed Lambda timeouts
4. **Cold Start Impact**: Potential latency issues for infrequent traffic patterns

We may reconsider this option in the future if:
- The application is refactored into smaller, more focused services
- API Gateway timeout limitations are increased
- Cold start performance improves significantly
- The cost-benefit analysis changes

## Review Date
This decision will be reviewed after the completion of the migration to ECS Fargate (estimated: Q4 2023).