#!/bin/bash
# scripts/setup-localstack.sh - Setup LocalStack with required AWS resources

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
    echo -e "${BLUE}=== LocalStack Setup Script ===${NC}"
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

# Check if cdklocal is available
check_cdklocal() {
    print_status "Checking cdklocal availability..."
    
    cd cdk
    if ! yarn cdklocal --version &> /dev/null; then
        print_error "cdklocal is not available via yarn!"
        print_status "Please install dependencies first:"
        echo "  cd cdk && yarn install"
        exit 1
    fi
    cd ..
    
    print_success "cdklocal is available via yarn"
}

# Deploy infrastructure to LocalStack
deploy_to_localstack() {
    print_status "Deploying infrastructure to LocalStack..."
    
    cd cdk
    
    # Set environment variables for LocalStack
    export AWS_ENDPOINT_URL=http://localhost:4566
    export AWS_ENDPOINT_URL_S3=http://localhost:4566
    export AWS_REGION=us-east-1
    export AWS_DEFAULT_REGION=us-east-1
    
    # Allow specific AWS environment variables
    export AWS_ENVAR_ALLOWLIST=AWS_REGION,AWS_DEFAULT_REGION
    
    print_status "Using LocalStack endpoints:"
    echo "  AWS_ENDPOINT_URL: $AWS_ENDPOINT_URL"
    echo "  AWS_ENDPOINT_URL_S3: $AWS_ENDPOINT_URL_S3"
    echo "  AWS_REGION: $AWS_REGION"
    
    # Deploy using cdklocal with simplified approach
    print_status "Running cdklocal deploy with simplified configuration..."
    yarn cdklocal deploy --app "npx ts-node bin/soundbite-localstack.ts" --all --require-approval never --verbose
    
    cd ..
}

# Verify resources were created
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
    
    # Wait for app to be ready
    sleep 5
    
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
}

# Main function
main() {
    print_header
    
    # Check prerequisites
    check_localstack
    check_cdklocal
    
    # Deploy infrastructure
    deploy_to_localstack
    
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
