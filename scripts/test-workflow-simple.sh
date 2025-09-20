#!/bin/bash

# Simple workflow testing script that simulates GitHub Actions locally
# This bypasses act and tests the actual commands that would run in CI

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test environment
export NODE_ENV=development-localstack
export CI=true
export AWS_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_ENDPOINT=http://localhost:4566

echo -e "${BLUE}🧪 Testing SoundBite CI/CD Workflows Locally${NC}"
echo ""

# Function to test a step
test_step() {
    local step_name="$1"
    local command="$2"
    
    echo -e "${YELLOW}📋 Testing: $step_name${NC}"
    echo "Command: $command"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ $step_name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $step_name failed${NC}"
        return 1
    fi
}

# Function to start LocalStack
start_localstack() {
    echo -e "${YELLOW}🐳 Starting LocalStack...${NC}"
    
    # Stop any existing LocalStack
    docker stop localstack-test 2>/dev/null || true
    docker rm localstack-test 2>/dev/null || true
    
    # Start LocalStack
    docker run -d \
        --name localstack-test \
        -p 4566:4566 \
        -e SERVICES=s3,sqs,dynamodb,sts \
        -e DEBUG=0 \
        localstack/localstack:3
    
    # Wait for LocalStack to be ready
    echo "Waiting for LocalStack to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ LocalStack is ready${NC}"
            return 0
        fi
        echo "Waiting... ($i/30)"
        sleep 2
    done
    
    echo -e "${RED}❌ LocalStack failed to start${NC}"
    return 1
}

# Function to stop LocalStack
stop_localstack() {
    echo -e "${YELLOW}🛑 Stopping LocalStack...${NC}"
    docker stop localstack-test 2>/dev/null || true
    docker rm localstack-test 2>/dev/null || true
}

# Function to test dev workflow
test_dev_workflow() {
    echo -e "${BLUE}🧪 Testing Dev CI Workflow${NC}"
    echo "=================================="
    
    local failed_steps=0
    
    # Start LocalStack
    if ! start_localstack; then
        return 1
    fi
    
    # Test steps
    test_step "Install dependencies" "yarn install --immutable" || ((failed_steps++))
    test_step "Run linting" "yarn lint" || ((failed_steps++))
    test_step "Run tests" "yarn test" || ((failed_steps++))
    test_step "Build application" "yarn build" || ((failed_steps++))
    
    # Test Docker build
    test_step "Build Docker image (dev)" "docker build -f Dockerfile.dev -t soundbite-test:dev ." || ((failed_steps++))
    test_step "Test Docker image (dev)" "docker stop test-dev || true && docker rm test-dev || true && docker run --rm -d --name test-dev -p 3000:3000 -e NODE_ENV=development-localstack soundbite-test:dev && sleep 20 && curl -f http://localhost:3000/health && docker stop test-dev" || ((failed_steps++))
    
    # Cleanup
    stop_localstack
    
    # Clean up Docker images to prevent duplicates
    echo -e "${YELLOW}🧹 Cleaning up Docker images...${NC}"
    docker rmi soundbite-test:dev 2>/dev/null || true
    
    if [ $failed_steps -eq 0 ]; then
        echo -e "${GREEN}🎉 Dev CI Workflow passed all tests!${NC}"
        return 0
    else
        echo -e "${RED}❌ Dev CI Workflow failed $failed_steps step(s)${NC}"
        return 1
    fi
}

# Function to test staging workflow
test_staging_workflow() {
    echo -e "${BLUE}🧪 Testing Staging CI Workflow${NC}"
    echo "====================================="
    
    local failed_steps=0
    
    # Start LocalStack
    if ! start_localstack; then
        return 1
    fi
    
    # Test steps
    test_step "Install dependencies" "yarn install --immutable" || ((failed_steps++))
    test_step "Run linting" "yarn lint" || ((failed_steps++))
    test_step "Run tests" "yarn test" || ((failed_steps++))
    test_step "Build application" "yarn build" || ((failed_steps++))
    
    # Test Docker build
    test_step "Build Docker image (staging)" "docker build -f Dockerfile -t soundbite-test:staging ." || ((failed_steps++))
    test_step "Test Docker image (staging)" "docker stop test-staging || true && docker rm test-staging || true && docker run --rm -d --name test-staging -p 3000:3000 -e NODE_ENV=staging soundbite-test:staging && sleep 20 && curl -f http://localhost:3000/health && docker stop test-staging" || ((failed_steps++))
    
    # Cleanup
    stop_localstack
    
    # Clean up Docker images to prevent duplicates
    echo -e "${YELLOW}🧹 Cleaning up Docker images...${NC}"
    docker rmi soundbite-test:staging 2>/dev/null || true
    
    if [ $failed_steps -eq 0 ]; then
        echo -e "${GREEN}🎉 Staging CI Workflow passed all tests!${NC}"
        return 0
    else
        echo -e "${RED}❌ Staging CI Workflow failed $failed_steps step(s)${NC}"
        return 1
    fi
}

# Function to test production workflow
test_production_workflow() {
    echo -e "${BLUE}🧪 Testing Production CI Workflow${NC}"
    echo "======================================="
    
    local failed_steps=0
    
    # Start LocalStack
    if ! start_localstack; then
        return 1
    fi
    
    # Test steps
    test_step "Install dependencies" "yarn install --immutable" || ((failed_steps++))
    test_step "Run linting" "yarn lint" || ((failed_steps++))
    test_step "Run tests" "yarn test" || ((failed_steps++))
    test_step "Build application" "yarn build" || ((failed_steps++))
    
    # Test Docker build (same as staging)
    test_step "Build Docker image (production)" "docker build -f Dockerfile -t soundbite-test:production ." || ((failed_steps++))
    test_step "Test Docker image (production)" "docker stop test-production || true && docker rm test-production || true && docker run --rm -d --name test-production -p 3000:3000 -e NODE_ENV=production soundbite-test:production && sleep 20 && curl -f http://localhost:3000/health && docker stop test-production" || ((failed_steps++))
    
    # Cleanup
    stop_localstack
    
    # Clean up Docker images to prevent duplicates
    echo -e "${YELLOW}🧹 Cleaning up Docker images...${NC}"
    docker rmi soundbite-test:production 2>/dev/null || true
    
    if [ $failed_steps -eq 0 ]; then
        echo -e "${GREEN}🎉 Production CI Workflow passed all tests!${NC}"
        return 0
    else
        echo -e "${RED}❌ Production CI Workflow failed $failed_steps step(s)${NC}"
        return 1
    fi
}

# Function to test all workflows
test_all_workflows() {
    echo -e "${BLUE}🧪 Testing All CI/CD Workflows${NC}"
    echo "=================================="
    
    local total_failed=0
    
    test_dev_workflow || ((total_failed++))
    echo ""
    test_staging_workflow || ((total_failed++))
    echo ""
    test_production_workflow || ((total_failed++))
    
    echo ""
    echo "=================================="
    if [ $total_failed -eq 0 ]; then
        echo -e "${GREEN}🎉 All workflows passed!${NC}"
        return 0
    else
        echo -e "${RED}❌ $total_failed workflow(s) failed${NC}"
        return 1
    fi
}

# Main function
main() {
    local command="${1:-all}"
    
    case $command in
        dev)
            test_dev_workflow
            ;;
        staging)
            test_staging_workflow
            ;;
        production)
            test_production_workflow
            ;;
        all)
            test_all_workflows
            ;;
        *)
            echo "Usage: $0 [dev|staging|production|all]"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
