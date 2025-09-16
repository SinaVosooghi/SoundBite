#!/bin/bash
# scripts/setup-localstack-simple.sh - Simple LocalStack setup without CDK

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
    echo -e "${BLUE}=== Simple LocalStack Setup ===${NC}"
}

# Check if LocalStack is running
check_localstack() {
    print_status "Checking LocalStack status..."
    
    if ! localstack status | grep -q "Runtime status.*running"; then
        print_error "LocalStack is not running!"
        print_status "Please start LocalStack first:"
        echo "  localstack start"
        exit 1
    fi
    
    print_success "LocalStack is running"
}

# Create AWS resources directly using AWS CLI
create_resources() {
    print_status "Creating AWS resources directly..."
    
    # Set environment variables for LocalStack
    export AWS_ENDPOINT_URL=http://localhost:4566
    export AWS_ENDPOINT_URL_S3=http://localhost:4566
    export AWS_REGION=us-east-1
    export AWS_DEFAULT_REGION=us-east-1
    
    print_status "Using LocalStack endpoints:"
    echo "  AWS_ENDPOINT_URL: $AWS_ENDPOINT_URL"
    echo "  AWS_ENDPOINT_URL_S3: $AWS_ENDPOINT_URL_S3"
    echo "  AWS_REGION: $AWS_REGION"
    
    # Create DynamoDB table
    print_status "Creating DynamoDB table..."
    aws dynamodb create-table \
        --table-name SoundBite-MultiEnv-SoundbitesTable \
        --attribute-definitions \
            AttributeName=pk,AttributeType=S \
            AttributeName=sk,AttributeType=S \
            AttributeName=environment,AttributeType=S \
            AttributeName=createdAt,AttributeType=S \
            AttributeName=userId,AttributeType=S \
        --key-schema \
            AttributeName=pk,KeyType=HASH \
            AttributeName=sk,KeyType=RANGE \
        --global-secondary-indexes \
            'IndexName=EnvironmentIndex,KeySchema=[{AttributeName=environment,KeyType=HASH},{AttributeName=createdAt,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
            'IndexName=UserIdIndex,KeySchema=[{AttributeName=userId,KeyType=HASH},{AttributeName=environment,KeyType=RANGE}],Projection={ProjectionType=ALL}' \
        --billing-mode PAY_PER_REQUEST \
        --tags Key=Project,Value=SoundBite Key=Environment,Value=development-localstack Key=Service,Value=Database || true
    
    # Enable TTL separately
    print_status "Enabling TTL for DynamoDB table..."
    aws dynamodb update-time-to-live \
        --table-name SoundBite-MultiEnv-SoundbitesTable \
        --time-to-live-specification AttributeName=ttl,Enabled=true || true
    
    # Create S3 bucket
    print_status "Creating S3 bucket..."
    aws s3 mb s3://soundbite-localstack-bucket || true
    
    # Create SQS queue
    print_status "Creating SQS queue..."
    aws sqs create-queue \
        --queue-name SoundBite-MultiEnv-SoundbiteQueue \
        --endpoint-url=http://localhost:4566 \
        --tags Project=SoundBite,Environment=development-localstack,Service=Queue || true
    
    # Create SQS DLQ
    print_status "Creating SQS DLQ..."
    aws sqs create-queue \
        --queue-name SoundBite-MultiEnv-SoundbiteDLQ \
        --endpoint-url=http://localhost:4566 \
        --tags Project=SoundBite,Environment=development-localstack,Service=Queue || true
}

# Verify resources were created
verify_resources() {
    print_status "Verifying resources in LocalStack..."
    
    # Check DynamoDB tables
    print_status "Checking DynamoDB tables..."
    if aws dynamodb list-tables --query 'TableNames' --output text | grep -q "SoundBite"; then
        print_success "DynamoDB tables created successfully"
    else
        print_error "DynamoDB tables not found"
    fi
    
    # Check S3 buckets
    print_status "Checking S3 buckets..."
    if aws s3 ls | grep -q "soundbite"; then
        print_success "S3 buckets created successfully"
    else
        print_error "S3 buckets not found"
    fi
    
    # Check SQS queues
    print_status "Checking SQS queues..."
    if aws sqs list-queues --query 'QueueUrls' --output text | grep -q "SoundBite"; then
        print_success "SQS queues created successfully"
    else
        print_error "SQS queues not found"
    fi
}

# Test the application
test_application() {
    print_status "Testing application with LocalStack..."
    
    # Wait for app to be ready
    sleep 5
    
    # Test basic endpoint
    if curl -s http://localhost:3000/ > /dev/null; then
        print_success "Application is responding"
        
        # Test soundbite creation
        print_status "Testing soundbite creation..."
        response=$(curl -s -X POST http://localhost:3000/soundbite \
            -H "Content-Type: application/json" \
            -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
            -d '{"text":"Testing LocalStack integration","voiceId":"Joanna"}' 2>&1)
        
        if echo "$response" | grep -q "id"; then
            print_success "Soundbite creation successful - LocalStack is working!"
        else
            print_error "Soundbite creation failed: $response"
        fi
    else
        print_error "Application is not responding"
    fi
}

# Main function
main() {
    print_header
    
    # Check prerequisites
    check_localstack
    
    # Create resources
    create_resources
    
    # Verify resources
    verify_resources
    
    # Test application
    test_application
    
    echo ""
    print_success "Simple LocalStack setup complete!"
    echo ""
    echo "Your LocalStack environment now has:"
    echo "✅ DynamoDB table: SoundBite-MultiEnv-SoundbitesTable"
    echo "✅ S3 bucket: soundbite-localstack-bucket"
    echo "✅ SQS queue: SoundBite-MultiEnv-SoundbiteQueue"
    echo "✅ SQS DLQ: SoundBite-MultiEnv-SoundbiteDLQ"
    echo ""
    echo "You can now use:"
    echo "  ./scripts/soundbite.sh dev localstack"
    echo ""
    echo "LocalStack endpoints:"
    echo "  DynamoDB: http://localhost:4566"
    echo "  S3: http://localhost:4566"
    echo "  SQS: http://localhost:4566"
}

# Run main function
main "$@"