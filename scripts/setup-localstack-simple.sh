#!/bin/bash
# scripts/setup-localstack-simple.sh - Simple LocalStack setup using AWS CLI

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

# Create DynamoDB table
create_dynamodb_table() {
    print_status "Creating DynamoDB table..."
    
    aws --endpoint-url=http://localhost:4566 dynamodb create-table \
        --table-name "SoundBite-MultiEnv-SoundbitesTable" \
        --attribute-definitions \
            AttributeName=pk,AttributeType=S \
            AttributeName=sk,AttributeType=S \
        --key-schema \
            AttributeName=pk,KeyType=HASH \
            AttributeName=sk,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        --region us-east-1
    
    print_success "DynamoDB table created"
}

# Create S3 bucket
create_s3_bucket() {
    print_status "Creating S3 bucket..."
    
    # Create bucket
    aws --endpoint-url=http://localhost:4566 s3 mb s3://soundbite-multienv-soundbites-000000000000 --region us-east-1
    
    # Create environment folders
    aws --endpoint-url=http://localhost:4566 s3api put-object --bucket soundbite-multienv-soundbites-000000000000 --key development/ --region us-east-1
    aws --endpoint-url=http://localhost:4566 s3api put-object --bucket soundbite-multienv-soundbites-000000000000 --key staging/ --region us-east-1
    aws --endpoint-url=http://localhost:4566 s3api put-object --bucket soundbite-multienv-soundbites-000000000000 --key production/ --region us-east-1
    
    print_success "S3 bucket and folders created"
}

# Create SQS queue
create_sqs_queue() {
    print_status "Creating SQS queue..."
    
    # Create main queue
    aws --endpoint-url=http://localhost:4566 sqs create-queue \
        --queue-name "SoundBite-MultiEnv-SoundbiteQueue" \
        --attributes '{"MessageRetentionPeriod":"1209600","VisibilityTimeout":"30"}' \
        --region us-east-1
    
    # Create DLQ
    aws --endpoint-url=http://localhost:4566 sqs create-queue \
        --queue-name "SoundBite-MultiEnv-SoundbiteDLQ" \
        --attributes '{"MessageRetentionPeriod":"1209600"}' \
        --region us-east-1
    
    print_success "SQS queues created"
}

# Verify resources
verify_resources() {
    print_status "Verifying resources in LocalStack..."
    
    # Check SQS queues
    print_status "Checking SQS queues..."
    if aws --endpoint-url=http://localhost:4566 sqs list-queues --query 'QueueUrls' --output text | grep -q "SoundBite"; then
        print_success "SQS queues created successfully"
    else
        print_error "SQS queues not found"
    fi
    
    # Check DynamoDB tables
    print_status "Checking DynamoDB tables..."
    if aws --endpoint-url=http://localhost:4566 dynamodb list-tables --query 'TableNames' --output text | grep -q "SoundBite"; then
        print_success "DynamoDB tables created successfully"
    else
        print_error "DynamoDB tables not found"
    fi
    
    # Check S3 buckets
    print_status "Checking S3 buckets..."
    if aws --endpoint-url=http://localhost:4566 s3 ls | grep -q "soundbite"; then
        print_success "S3 buckets created successfully"
    else
        print_error "S3 buckets not found"
    fi
}

# Test the application
test_application() {
    print_status "Testing application with LocalStack..."
    
    # Start the app in background
    print_status "Starting application in LocalStack mode..."
    export AWS_CONNECTION_MODE=localstack
    ./scripts/soundbite.sh dev localstack &
    local PID=$!
    
    # Wait for app to start
    sleep 20
    
    # Test basic endpoint
    if curl -s http://localhost:3000/ > /dev/null; then
        print_success "Application is responding"
        
        # Test soundbite creation
        print_status "Testing soundbite creation..."
        response=$(curl -s -X POST http://localhost:3000/soundbite \
            -H "Content-Type: application/json" \
            -d '{"text":"Testing LocalStack integration"}' 2>&1)
        
        if echo "$response" | grep -q "id"; then
            print_success "Soundbite creation successful - LocalStack is working!"
        else
            print_error "Soundbite creation failed: $response"
        fi
    else
        print_error "Application is not responding"
    fi
    
    # Stop the app
    kill $PID 2>/dev/null || true
    wait $PID 2>/dev/null || true
}

# Main function
main() {
    print_header
    
    # Check prerequisites
    check_localstack
    
    # Create resources
    create_dynamodb_table
    create_s3_bucket
    create_sqs_queue
    
    # Verify resources
    verify_resources
    
    # Test application
    test_application
    
    echo ""
    print_success "LocalStack setup complete!"
    echo ""
    echo "Your LocalStack environment now has:"
    echo "✅ SQS queues for message processing"
    echo "✅ DynamoDB tables for data storage"
    echo "✅ S3 buckets for file storage"
    echo ""
    echo "You can now use:"
    echo "  ./scripts/soundbite.sh dev localstack"
    echo ""
    echo "LocalStack endpoints:"
    echo "  SQS: http://localhost:4566"
    echo "  DynamoDB: http://localhost:4566"
    echo "  S3: http://localhost:4566"
}

# Run main function
main "$@"
