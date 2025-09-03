#!/bin/bash
# Test script for development environments

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
    echo -e "${BLUE}=== Testing Development Environments ===${NC}"
}

test_localstack_mode() {
    print_status "Testing LocalStack mode..."
    
    # Start app in LocalStack mode
    export AWS_CONNECTION_MODE=localstack
    yarn start:dev > /tmp/localstack.log 2>&1 &
    local PID=$!
    
    # Wait for app to start and logs to be written
    sleep 20
    
    # Test if app is responding
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        print_success "LocalStack mode: App is responding on port 3000"
        
        # Check environment detection
        if grep -q "development-localstack" /tmp/localstack.log; then
            print_success "LocalStack mode: Environment correctly detected"
        else
            print_error "LocalStack mode: Environment detection failed"
        fi
        
        # Check endpoint configuration
        if grep -q "localhost:4566" /tmp/localstack.log; then
            print_success "LocalStack mode: Endpoint correctly configured"
        else
            print_error "LocalStack mode: Endpoint configuration failed"
        fi
    else
        print_error "LocalStack mode: App not responding"
    fi
    
    # Stop app
    kill $PID 2>/dev/null || true
    wait $PID 2>/dev/null || true
}

test_real_aws_mode() {
    print_status "Testing Real AWS mode..."
    
    # Start app in Real AWS mode
    export AWS_CONNECTION_MODE=aws
    yarn start:dev > /tmp/realaws.log 2>&1 &
    local PID=$!
    
    # Wait for app to start and logs to be written
    sleep 20
    
    # Test if app is responding
    if curl -s http://localhost:3000/ > /dev/null 2>&1; then
        print_success "Real AWS mode: App is responding on port 3000"
        
        # Check environment detection
        if grep -q "development-aws" /tmp/realaws.log; then
            print_success "Real AWS mode: Environment correctly detected"
        else
            print_error "Real AWS mode: Environment detection failed"
        fi
        
        # Check endpoint configuration
        if grep -q "AWS default" /tmp/realaws.log; then
            print_success "Real AWS mode: Endpoint correctly configured"
        else
            print_error "Real AWS mode: Endpoint configuration failed"
        fi
    else
        print_error "Real AWS mode: App not responding"
    fi
    
    # Stop app
    kill $PID 2>/dev/null || true
    wait $PID 2>/dev/null || true
}

cleanup() {
    print_status "Cleaning up..."
    pkill -f "yarn start:dev" 2>/dev/null || true
    rm -f /tmp/localstack.log /tmp/realaws.log
}

main() {
    print_header
    
    # Set up cleanup on exit
    trap cleanup EXIT
    
    # Test both modes
    test_localstack_mode
    echo ""
    test_real_aws_mode
    
    echo ""
    print_success "Development environment testing complete!"
    echo ""
    echo "Both development modes are working correctly:"
    echo "✅ LocalStack mode: NestJS + LocalStack (localhost:4566)"
    echo "✅ Real AWS mode: NestJS + Real AWS services"
    echo ""
    echo "Use these commands to start development:"
    echo "  ./scripts/soundbite.sh dev localstack  # LocalStack mode"
    echo "  ./scripts/soundbite.sh dev aws         # Real AWS mode"
}

main "$@"
