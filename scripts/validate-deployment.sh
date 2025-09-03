#!/bin/bash

# Deployment Validation Script
# This script performs comprehensive validation of a SoundBite deployment

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-staging}"
TIMEOUT_MINUTES="${2:-10}"
VERBOSE="${3:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_verbose() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${BLUE}🔍 $1${NC}"
    fi
}

# Validation functions
validate_environment() {
    log_info "Validating environment: $ENVIRONMENT"
    
    case "$ENVIRONMENT" in
        development|staging|production)
            log_success "Valid environment: $ENVIRONMENT"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_error "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

check_aws_credentials() {
    log_info "Checking AWS credentials..."
    
    if aws sts get-caller-identity >/dev/null 2>&1; then
        ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
        USER_ARN=$(aws sts get-caller-identity --query 'Arn' --output text)
        log_success "AWS credentials valid"
        log_verbose "Account ID: $ACCOUNT_ID"
        log_verbose "User ARN: $USER_ARN"
    else
        log_error "AWS credentials not configured or invalid"
        exit 1
    fi
}

get_api_endpoint() {
    log_info "Getting API endpoint for $ENVIRONMENT..."
    
    # Try different stack naming conventions
    STACK_NAMES=(
        "SoundBite-${ENVIRONMENT}-API"
        "SoundBite-API-${ENVIRONMENT}"
        "soundbite-${ENVIRONMENT}-api"
    )
    
    for stack_name in "${STACK_NAMES[@]}"; do
        log_verbose "Trying stack name: $stack_name"
        
        API_ENDPOINT=$(aws cloudformation describe-stacks \
            --stack-name "$stack_name" \
            --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$API_ENDPOINT" ] && [ "$API_ENDPOINT" != "None" ]; then
            log_success "Found API endpoint: $API_ENDPOINT"
            echo "$API_ENDPOINT"
            return 0
        fi
    done
    
    log_error "Could not find API endpoint for environment: $ENVIRONMENT"
    return 1
}

validate_api_health() {
    local api_endpoint="$1"
    log_info "Validating API health..."
    
    local timeout_seconds=$((TIMEOUT_MINUTES * 60))
    local start_time=$(date +%s)
    local success=false
    
    while [ $(($(date +%s) - start_time)) -lt $timeout_seconds ]; do
        log_verbose "Checking health endpoint: $api_endpoint/health"
        
        if response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$api_endpoint/health" 2>/dev/null); then
            http_code="${response: -3}"
            
            if [ "$http_code" = "200" ]; then
                log_success "API health check passed (HTTP $http_code)"
                
                if jq . /tmp/health_response.json >/dev/null 2>&1; then
                    log_verbose "Health response: $(cat /tmp/health_response.json)"
                fi
                
                success=true
                break
            else
                log_warning "Health check returned HTTP $http_code"
                if [ "$VERBOSE" = "true" ]; then
                    cat /tmp/health_response.json 2>/dev/null || echo "No response body"
                fi
            fi
        else
            log_warning "Health check request failed"
        fi
        
        log_verbose "Retrying in 10 seconds..."
        sleep 10
    done
    
    if [ "$success" = "true" ]; then
        return 0
    else
        log_error "API health check failed after $TIMEOUT_MINUTES minutes"
        return 1
    fi
}

validate_infrastructure() {
    log_info "Validating infrastructure components..."
    
    # Check DynamoDB table
    local table_name="SoundBite-${ENVIRONMENT}-SoundbitesTable"
    log_verbose "Checking DynamoDB table: $table_name"
    
    if table_status=$(aws dynamodb describe-table \
        --table-name "$table_name" \
        --query 'Table.TableStatus' \
        --output text 2>/dev/null); then
        
        if [ "$table_status" = "ACTIVE" ]; then
            log_success "DynamoDB table is active"
        else
            log_error "DynamoDB table status: $table_status"
            return 1
        fi
    else
        log_error "DynamoDB table not found: $table_name"
        return 1
    fi
    
    # Check S3 bucket
    local bucket_name="soundbite-${ENVIRONMENT}-soundbites"
    log_verbose "Checking S3 bucket: $bucket_name"
    
    if aws s3 ls "s3://$bucket_name" >/dev/null 2>&1; then
        log_success "S3 bucket is accessible"
    else
        log_error "S3 bucket is not accessible: $bucket_name"
        return 1
    fi
    
    # Check SQS queue
    local queue_name="SoundBite-${ENVIRONMENT}-Queue"
    log_verbose "Checking SQS queue: $queue_name"
    
    if queue_url=$(aws sqs get-queue-url \
        --queue-name "$queue_name" \
        --query 'QueueUrl' \
        --output text 2>/dev/null); then
        
        log_success "SQS queue is accessible"
        log_verbose "Queue URL: $queue_url"
    else
        log_error "SQS queue not found: $queue_name"
        return 1
    fi
    
    # Check Lambda function
    local function_name="SoundBite-${ENVIRONMENT}-Processor"
    log_verbose "Checking Lambda function: $function_name"
    
    if function_status=$(aws lambda get-function \
        --function-name "$function_name" \
        --query 'Configuration.State' \
        --output text 2>/dev/null); then
        
        if [ "$function_status" = "Active" ]; then
            log_success "Lambda function is active"
        else
            log_error "Lambda function status: $function_status"
            return 1
        fi
    else
        log_error "Lambda function not found: $function_name"
        return 1
    fi
    
    return 0
}

validate_api_functionality() {
    local api_endpoint="$1"
    log_info "Validating API functionality..."
    
    # Test OpenAPI documentation
    log_verbose "Testing OpenAPI documentation endpoint"
    if curl -f -s "$api_endpoint/api" >/dev/null 2>&1; then
        log_success "OpenAPI documentation accessible"
    else
        log_warning "OpenAPI documentation not accessible"
    fi
    
    # Test CORS preflight
    log_verbose "Testing CORS preflight"
    if curl -f -s -X OPTIONS \
        -H "Origin: https://example.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        "$api_endpoint/soundbites" >/dev/null 2>&1; then
        log_success "CORS preflight working"
    else
        log_warning "CORS preflight may not be configured"
    fi
    
    # Test rate limiting (if not production)
    if [ "$ENVIRONMENT" != "production" ]; then
        log_verbose "Testing rate limiting"
        
        # Make multiple rapid requests
        local rate_limit_hit=false
        for i in {1..20}; do
            if ! curl -f -s "$api_endpoint/health" >/dev/null 2>&1; then
                rate_limit_hit=true
                break
            fi
        done
        
        if [ "$rate_limit_hit" = "true" ]; then
            log_success "Rate limiting is working"
        else
            log_warning "Rate limiting may not be configured"
        fi
    fi
    
    return 0
}

run_smoke_tests() {
    local api_endpoint="$1"
    log_info "Running smoke tests..."
    
    # Test 1: Create a soundbite (if not production)
    if [ "$ENVIRONMENT" != "production" ]; then
        log_verbose "Testing soundbite creation"
        
        if response=$(curl -s -w "%{http_code}" -o /tmp/create_response.json \
            -X POST "$api_endpoint/soundbites" \
            -H "Content-Type: application/json" \
            -d '{"text":"Deployment validation test","voice":"Joanna"}' 2>/dev/null); then
            
            http_code="${response: -3}"
            
            if [ "$http_code" = "201" ] || [ "$http_code" = "202" ]; then
                log_success "Soundbite creation test passed (HTTP $http_code)"
                
                if jq . /tmp/create_response.json >/dev/null 2>&1; then
                    soundbite_id=$(cat /tmp/create_response.json | jq -r '.id // empty')
                    if [ -n "$soundbite_id" ]; then
                        log_verbose "Created soundbite ID: $soundbite_id"
                        
                        # Test 2: Get soundbite status
                        sleep 2
                        if curl -f -s "$api_endpoint/soundbites/$soundbite_id" >/dev/null 2>&1; then
                            log_success "Soundbite retrieval test passed"
                        else
                            log_warning "Soundbite retrieval test failed"
                        fi
                    fi
                fi
            else
                log_warning "Soundbite creation returned HTTP $http_code"
                if [ "$VERBOSE" = "true" ]; then
                    cat /tmp/create_response.json 2>/dev/null || echo "No response body"
                fi
            fi
        else
            log_warning "Soundbite creation test failed"
        fi
    else
        log_info "Skipping functional tests in production environment"
    fi
    
    return 0
}

check_monitoring() {
    log_info "Checking monitoring and alerting..."
    
    # Check CloudWatch alarms
    log_verbose "Checking CloudWatch alarms"
    
    if alarms=$(aws cloudwatch describe-alarms \
        --state-value ALARM \
        --query "MetricAlarms[?starts_with(AlarmName, 'SoundBite-${ENVIRONMENT}')].[AlarmName,StateReason]" \
        --output text 2>/dev/null); then
        
        if [ -n "$alarms" ]; then
            log_warning "Active CloudWatch alarms found:"
            echo "$alarms"
        else
            log_success "No active CloudWatch alarms"
        fi
    else
        log_warning "Could not check CloudWatch alarms"
    fi
    
    # Check recent logs
    log_verbose "Checking recent application logs"
    
    local function_name="SoundBite-${ENVIRONMENT}-Processor"
    if aws logs describe-log-groups \
        --log-group-name-prefix "/aws/lambda/$function_name" >/dev/null 2>&1; then
        
        log_success "Lambda logs are available"
        
        # Check for recent errors
        if error_count=$(aws logs filter-log-events \
            --log-group-name "/aws/lambda/$function_name" \
            --start-time $(date -d '1 hour ago' +%s)000 \
            --filter-pattern 'ERROR' \
            --query 'events | length(@)' \
            --output text 2>/dev/null); then
            
            if [ "$error_count" -gt 0 ]; then
                log_warning "Found $error_count errors in Lambda logs (last hour)"
            else
                log_success "No errors in Lambda logs (last hour)"
            fi
        fi
    else
        log_warning "Lambda logs not available"
    fi
    
    return 0
}

generate_report() {
    local api_endpoint="$1"
    local validation_status="$2"
    
    log_info "Generating deployment validation report..."
    
    cat > deployment-validation-report.md << EOF
# Deployment Validation Report

**Environment:** $ENVIRONMENT
**Validation Date:** $(date)
**API Endpoint:** $api_endpoint
**Overall Status:** $validation_status

## Validation Results

### ✅ Completed Checks
- Environment validation
- AWS credentials verification
- API endpoint discovery
- API health check
- Infrastructure component validation
- API functionality testing
- Smoke tests execution
- Monitoring and alerting check

### 📊 Environment Details
- **AWS Region:** $(aws configure get region 2>/dev/null || echo "us-east-1")
- **AWS Account:** $(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo "Unknown")
- **Deployment Time:** $(date)
- **Validation Duration:** $(($(date +%s) - START_TIME)) seconds

### 🔗 Useful Links
- [API Health Endpoint]($api_endpoint/health)
- [API Documentation]($api_endpoint/api)
- [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups)
- [CloudFormation Stacks](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks)

### 📋 Next Steps
1. Monitor the environment for the next 30 minutes
2. Run additional performance tests if needed
3. Verify all monitoring and alerting is working
4. Update documentation with any changes
5. Notify stakeholders of successful deployment

EOF

    log_success "Deployment validation report generated: deployment-validation-report.md"
}

# Main execution
main() {
    local start_time=$(date +%s)
    START_TIME=$start_time
    
    log_info "Starting deployment validation for $ENVIRONMENT environment"
    log_info "Timeout: $TIMEOUT_MINUTES minutes"
    
    # Step 1: Validate environment
    validate_environment
    
    # Step 2: Check AWS credentials
    check_aws_credentials
    
    # Step 3: Get API endpoint
    if ! api_endpoint=$(get_api_endpoint); then
        log_error "Failed to get API endpoint"
        exit 1
    fi
    
    # Step 4: Validate API health
    if ! validate_api_health "$api_endpoint"; then
        log_error "API health validation failed"
        exit 1
    fi
    
    # Step 5: Validate infrastructure
    if ! validate_infrastructure; then
        log_error "Infrastructure validation failed"
        exit 1
    fi
    
    # Step 6: Validate API functionality
    if ! validate_api_functionality "$api_endpoint"; then
        log_warning "Some API functionality tests failed"
    fi
    
    # Step 7: Run smoke tests
    if ! run_smoke_tests "$api_endpoint"; then
        log_warning "Some smoke tests failed"
    fi
    
    # Step 8: Check monitoring
    if ! check_monitoring; then
        log_warning "Some monitoring checks failed"
    fi
    
    # Step 9: Generate report
    generate_report "$api_endpoint" "✅ PASSED"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_success "Deployment validation completed successfully in ${duration} seconds"
    log_success "Environment $ENVIRONMENT is ready for use"
    
    return 0
}

# Script usage
usage() {
    echo "Usage: $0 [environment] [timeout_minutes] [verbose]"
    echo ""
    echo "Arguments:"
    echo "  environment      Target environment (development|staging|production)"
    echo "  timeout_minutes  Timeout for health checks in minutes (default: 10)"
    echo "  verbose          Enable verbose logging (true|false, default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production 15 true"
    echo "  $0 development 5 false"
    exit 1
}

# Handle help flag
if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    usage
fi

# Execute main function
main "$@"