#!/bin/bash
# scripts/promote-environment.sh - Environment promotion automation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== Environment Promotion Tool ===${NC}"
}

# Environment validation functions
validate_environment() {
    local env=$1
    print_status "Validating $env environment..."
    
    case "$env" in
        "dev-localstack")
            # Check if LocalStack is running
            if ! localstack status | grep -q "Runtime status.*running"; then
                print_error "LocalStack is not running!"
                return 1
            fi
            print_success "LocalStack is running"
            ;;
        "dev-aws")
            # Check if AWS credentials are configured
            if ! aws sts get-caller-identity >/dev/null 2>&1; then
                print_error "AWS credentials not configured!"
                return 1
            fi
            print_success "AWS credentials configured"
            ;;
        "dev-aws-deployed")
            # Check if AWS resources are deployed
            if ! aws cloudformation describe-stacks --stack-name SoundBite-dev-API >/dev/null 2>&1; then
                print_error "Dev AWS resources not deployed!"
                return 1
            fi
            print_success "Dev AWS resources deployed"
            ;;
        "staging")
            # Check if staging resources are deployed
            if ! aws cloudformation describe-stacks --stack-name SoundBite-staging-API >/dev/null 2>&1; then
                print_error "Staging resources not deployed!"
                return 1
            fi
            print_success "Staging resources deployed"
            ;;
        "production")
            # Check if production resources are deployed
            if ! aws cloudformation describe-stacks --stack-name SoundBite-prod-API >/dev/null 2>&1; then
                print_error "Production resources not deployed!"
                return 1
            fi
            print_success "Production resources deployed"
            ;;
        *)
            print_error "Unknown environment: $env"
            return 1
            ;;
    esac
}

# Health check functions
check_health() {
    local env=$1
    print_status "Checking health of $env environment..."
    
    case "$env" in
        "dev-localstack")
            # Check if local application is responding
            if curl -f http://localhost:3000/health >/dev/null 2>&1; then
                print_success "Local application is healthy"
            else
                print_error "Local application is not responding"
                return 1
            fi
            ;;
        "dev-aws")
            # Check if local application with AWS is responding
            if curl -f http://localhost:3000/health >/dev/null 2>&1; then
                print_success "Local application with AWS is healthy"
            else
                print_error "Local application with AWS is not responding"
                return 1
            fi
            ;;
        "dev-aws-deployed"|"staging"|"production")
            # Get API endpoint from CloudFormation
            local stack_name="SoundBite-${env#dev-aws-deployed}-API"
            if [ "$env" = "dev-aws-deployed" ]; then
                stack_name="SoundBite-dev-API"
            fi
            
            local api_endpoint=$(aws cloudformation describe-stacks \
                --stack-name "$stack_name" \
                --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
                --output text 2>/dev/null || echo "")
            
            if [ -z "$api_endpoint" ]; then
                print_error "Could not get API endpoint for $env"
                return 1
            fi
            
            if curl -f "$api_endpoint/health" >/dev/null 2>&1; then
                print_success "$env API is healthy at $api_endpoint"
            else
                print_error "$env API is not responding at $api_endpoint"
                return 1
            fi
            ;;
    esac
}

# Promotion functions
promote_to_dev_aws() {
    print_status "Promoting dev-localstack to dev-aws..."
    
    # Validate source environment
    if ! validate_environment "dev-localstack"; then
        print_error "Source environment validation failed"
        return 1
    fi
    
    # Check health
    if ! check_health "dev-localstack"; then
        print_error "Source environment health check failed"
        return 1
    fi
    
    # Start dev-aws environment
    print_status "Starting dev-aws environment..."
    export AWS_CONNECTION_MODE=aws
    yarn start:dev &
    local pid=$!
    
    # Wait for application to start
    sleep 10
    
    # Check health
    if ! check_health "dev-aws"; then
        print_error "Target environment health check failed"
        kill $pid 2>/dev/null || true
        return 1
    fi
    
    print_success "Successfully promoted to dev-aws"
    kill $pid 2>/dev/null || true
}

promote_to_dev_aws_deployed() {
    print_status "Promoting dev-aws to dev-aws-deployed..."
    
    # Validate source environment
    if ! validate_environment "dev-aws"; then
        print_error "Source environment validation failed"
        return 1
    fi
    
    # Deploy to AWS
    print_status "Deploying to AWS dev environment..."
    cd cdk
    npx cdk deploy --all --context environment=development
    cd ..
    
    # Check health
    if ! check_health "dev-aws-deployed"; then
        print_error "Target environment health check failed"
        return 1
    fi
    
    print_success "Successfully promoted to dev-aws-deployed"
}

promote_to_staging() {
    print_status "Promoting dev-aws-deployed to staging..."
    
    # Validate source environment
    if ! validate_environment "dev-aws-deployed"; then
        print_error "Source environment validation failed"
        return 1
    fi
    
    # Deploy to staging
    print_status "Deploying to staging environment..."
    cd cdk
    npx cdk deploy --all --context environment=staging
    cd ..
    
    # Check health
    if ! check_health "staging"; then
        print_error "Target environment health check failed"
        return 1
    fi
    
    print_success "Successfully promoted to staging"
}

promote_to_production() {
    print_status "Promoting staging to production..."
    
    # Validate source environment
    if ! validate_environment "staging"; then
        print_error "Source environment validation failed"
        return 1
    fi
    
    # Deploy to production
    print_status "Deploying to production environment..."
    cd cdk
    npx cdk deploy --all --context environment=production
    cd ..
    
    # Check health
    if ! check_health "production"; then
        print_error "Target environment health check failed"
        return 1
    fi
    
    print_success "Successfully promoted to production"
}

# Main promotion function
promote_environment() {
    local from_env=$1
    local to_env=$2
    
    print_header
    print_status "Promoting from $from_env to $to_env"
    
    # Validate promotion flow
    case "$from_env" in
        "dev-localstack")
            if [ "$to_env" != "dev-aws" ]; then
                print_error "Invalid promotion flow: $from_env -> $to_env"
                print_error "Valid flow: dev-localstack -> dev-aws"
                return 1
            fi
            promote_to_dev_aws
            ;;
        "dev-aws")
            if [ "$to_env" != "dev-aws-deployed" ]; then
                print_error "Invalid promotion flow: $from_env -> $to_env"
                print_error "Valid flow: dev-aws -> dev-aws-deployed"
                return 1
            fi
            promote_to_dev_aws_deployed
            ;;
        "dev-aws-deployed")
            if [ "$to_env" != "staging" ]; then
                print_error "Invalid promotion flow: $from_env -> $to_env"
                print_error "Valid flow: dev-aws-deployed -> staging"
                return 1
            fi
            promote_to_staging
            ;;
        "staging")
            if [ "$to_env" != "production" ]; then
                print_error "Invalid promotion flow: $from_env -> $to_env"
                print_error "Valid flow: staging -> production"
                return 1
            fi
            promote_to_production
            ;;
        *)
            print_error "Unknown source environment: $from_env"
            return 1
            ;;
    esac
}

# Rollback function
rollback_environment() {
    local from_env=$1
    local to_env=$2
    
    print_header
    print_status "Rolling back from $from_env to $to_env"
    
    # This is a simplified rollback - in production, you'd want more sophisticated rollback
    print_error "Rollback functionality not yet implemented"
    print_status "Please manually rollback using CDK or AWS console"
    return 1
}

# Show help
show_help() {
    echo "Usage: $0 {promote|rollback|validate|health} <from_env> [to_env]"
    echo ""
    echo "Commands:"
    echo "  promote <from> <to>  - Promote from one environment to another"
    echo "  rollback <from> <to> - Rollback from one environment to another"
    echo "  validate <env>       - Validate environment configuration"
    echo "  health <env>         - Check environment health"
    echo ""
    echo "Environments:"
    echo "  dev-localstack: LocalStack + Local NestJS"
    echo "  dev-aws: AWS + Local NestJS"
    echo "  dev-aws-deployed: AWS + AWS NestJS"
    echo "  staging: AWS + AWS NestJS (Staging)"
    echo "  production: AWS + AWS NestJS (Production)"
    echo ""
    echo "Valid promotion flows:"
    echo "  dev-localstack -> dev-aws"
    echo "  dev-aws -> dev-aws-deployed"
    echo "  dev-aws-deployed -> staging"
    echo "  staging -> production"
    echo ""
    echo "Examples:"
    echo "  $0 promote dev-localstack dev-aws"
    echo "  $0 validate dev-aws-deployed"
    echo "  $0 health staging"
}

# Main function
main() {
    case "${1:-}" in
        "promote")
            if [ $# -ne 3 ]; then
                print_error "Usage: $0 promote <from_env> <to_env>"
                show_help
                exit 1
            fi
            promote_environment "$2" "$3"
            ;;
        "rollback")
            if [ $# -ne 3 ]; then
                print_error "Usage: $0 rollback <from_env> <to_env>"
                show_help
                exit 1
            fi
            rollback_environment "$2" "$3"
            ;;
        "validate")
            if [ $# -ne 2 ]; then
                print_error "Usage: $0 validate <env>"
                show_help
                exit 1
            fi
            validate_environment "$2"
            ;;
        "health")
            if [ $# -ne 2 ]; then
                print_error "Usage: $0 health <env>"
                show_help
                exit 1
            fi
            check_health "$2"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"