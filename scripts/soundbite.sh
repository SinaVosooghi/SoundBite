#!/bin/bash
# scripts/soundbite.sh - Main entry point for all SoundBite operations

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
    echo -e "${BLUE}=== SoundBite Multi-Environment Management Tool ===${NC}"
}

# Main function
main() {
    print_header
    
    case "${1:-}" in
        "dev")
            shift
            print_status "Starting development environment..."
            case "${1:-}" in
                "localstack")
                    print_status "Starting with LocalStack..."
                    
                    # Check if LocalStack is running
                    if ! localstack status | grep -q "Runtime status.*running"; then
                        print_error "LocalStack is not running!"
                        echo "Please start LocalStack first:"
                        echo "  localstack start"
                        echo ""
                        echo "Or use Real AWS mode instead:"
                        echo "  $0 dev aws"
                        exit 1
                    fi
                    
                    print_status "LocalStack is running, starting development server..."
                    export AWS_CONNECTION_MODE=localstack
                    yarn start:dev
                    ;;
                "aws")
                    print_status "Starting with Real AWS services..."
                    export AWS_CONNECTION_MODE=aws
                    yarn start:dev
                    ;;
                *)
                    print_status "Starting with LocalStack (default)..."
                    export AWS_CONNECTION_MODE=localstack
                    yarn start:dev
                    ;;
            esac
            ;;
        "deploy")
            shift
            case "${1:-}" in
                "staging")
                    print_status "Deploying staging environment..."
                    ./scripts/deploy-staging.sh
                    ;;
                "production")
                    print_status "Deploying production environment..."
                    ./scripts/deploy-production.sh
                    ;;
                *)
                    print_error "Please specify: staging or production"
                    show_help
                    exit 1
                    ;;
            esac
            ;;
        "build")
            shift
            case "${1:-}" in
                "staging")
                    print_status "Building staging Docker image..."
                    docker build -f Dockerfile.staging -t soundbite:staging .
                    ;;
                "production")
                    print_status "Building production Docker image..."
                    docker build -f Dockerfile.production -t soundbite:production .
                    ;;
                "all")
                    print_status "Building all Docker images..."
                    docker build -f Dockerfile.staging -t soundbite:staging .
                    docker build -f Dockerfile.production -t soundbite:production .
                    ;;
                *)
                    print_error "Please specify: staging, production, or all"
                    show_help
                    exit 1
                    ;;
            esac
            ;;
        "status")
            print_status "Checking system status..."
            echo "Development: Run 'yarn start:dev' locally"
            echo "Staging: http://52.91.104.44/staging/"
            echo "Production: http://52.91.104.44/prod/"
            ;;
        "test")
            shift
            print_status "Running tests..."
            yarn test
            ;;
        "setup-localstack")
            print_status "Setting up LocalStack environment..."
            ./scripts/setup-localstack.sh
            ;;
        "cdk")
            shift
            print_status "CDK operations..."
            cd cdk
            case "${1:-}" in
                "deploy")
                    npx cdk deploy --app "npx ts-node bin/soundbite-multienv.ts" --all --require-approval never
                    ;;
                "destroy")
                    npx cdk destroy --app "npx ts-node bin/soundbite-multienv.ts" --all --force
                    ;;
                "synth")
                    npx cdk synth --app "npx ts-node bin/soundbite-multienv.ts"
                    ;;
                *)
                    print_error "Please specify: deploy, destroy, or synth"
                    show_help
                    exit 1
                    ;;
            esac
            cd ..
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

show_help() {
    echo "Usage: $0 {dev|deploy|build|status|test|cdk|help}"
    echo ""
    echo "Commands:"
    echo "  dev [localstack|aws] - Start development environment"
    echo "                         localstack: Use LocalStack (default)"
    echo "                         aws: Use real AWS services"
    echo ""
    echo "  setup-localstack      - Setup LocalStack environment"
    echo "  deploy {staging|production} - Deploy specific environment"
    echo "  build {staging|production|all} - Build Docker images"
    echo "  status                 - Check system status"
    echo "  test                   - Run tests"
    echo "  cdk {deploy|destroy|synth} - CDK operations"
    echo "  help                   - Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 dev localstack     # Start dev with LocalStack"
    echo "  $0 dev aws            # Start dev with real AWS"
    echo "  $0 setup-localstack   # Setup LocalStack environment"
    echo "  $0 deploy staging     # Deploy staging to AWS"
    echo "  $0 deploy production  # Deploy production to AWS"
    echo "  $0 build all          # Build all Docker images"
    echo "  $0 cdk deploy         # Deploy CDK stacks"
}

# Run main function
main "$@" 