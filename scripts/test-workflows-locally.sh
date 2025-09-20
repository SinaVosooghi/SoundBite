#!/bin/bash

# SoundBite Local GitHub Actions Testing Script
# This script uses 'act' to run GitHub Actions workflows locally

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if act is installed
check_act() {
    if ! command -v act &> /dev/null; then
        echo -e "${RED}❌ 'act' is not installed${NC}"
        echo -e "${YELLOW}📦 Install act:${NC}"
        echo "  macOS: brew install act"
        echo "  Linux: curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash"
        echo "  Windows: choco install act-cli"
        echo ""
        echo -e "${YELLOW}📖 Or visit: https://github.com/nektos/act#installation${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ act is installed${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info &> /dev/null; then
        echo -e "${RED}❌ Docker is not running${NC}"
        echo -e "${YELLOW}🐳 Please start Docker Desktop${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker is running${NC}"
}

# Install act if not present
install_act() {
    if ! command -v act &> /dev/null; then
        echo -e "${YELLOW}📦 Installing act...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            if command -v brew &> /dev/null; then
                brew install act
            else
                echo -e "${RED}❌ Homebrew not found. Please install act manually${NC}"
                exit 1
            fi
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
        else
            echo -e "${RED}❌ Unsupported OS. Please install act manually${NC}"
            exit 1
        fi
    fi
}

# Test dev workflow
test_dev_workflow() {
    echo -e "${BLUE}🧪 Testing Dev CI Workflow...${NC}"
    
    # Test with push event
    act push -W .github/workflows/ci-dev.yml \
        --eventpath .github/events/dev-push.json \
        --platform ubuntu-latest=catthehacker/ubuntu:act-latest \
        --artifact-server-path /tmp/artifacts \
        --env NODE_VERSION=22 \
        --env YARN_VERSION=4.9.4 \
        --env AWS_REGION=us-east-1 \
        --env AWS_ACCESS_KEY_ID=test \
        --env AWS_SECRET_ACCESS_KEY=test \
        --env AWS_ENDPOINT=http://localhost:4566 \
        --verbose
}

# Test staging workflow
test_staging_workflow() {
    echo -e "${BLUE}🧪 Testing Staging CI Workflow...${NC}"
    
    # Test with push event
    act push -W .github/workflows/ci-staging-prod.yml \
        --eventpath .github/events/staging-push.json \
        --platform ubuntu-latest=catthehacker/ubuntu:act-latest \
        --artifact-server-path /tmp/artifacts \
        --env NODE_VERSION=22 \
        --env YARN_VERSION=4.9.4 \
        --env AWS_REGION=us-east-1 \
        --env ECR_REGISTRY=762233763891.dkr.ecr.us-east-1.amazonaws.com \
        --env ECR_REPOSITORY=soundbite-development-api \
        --env AWS_ACCESS_KEY_ID=test \
        --env AWS_SECRET_ACCESS_KEY=test \
        --env AWS_ENDPOINT=http://localhost:4566 \
        --verbose
}

# Test production workflow
test_production_workflow() {
    echo -e "${BLUE}🧪 Testing Production CI Workflow...${NC}"
    
    # Test with push event
    act push -W .github/workflows/ci-staging-prod.yml \
        --eventpath .github/events/production-push.json \
        --platform ubuntu-latest=catthehacker/ubuntu:act-latest \
        --artifact-server-path /tmp/artifacts \
        --env NODE_VERSION=22 \
        --env YARN_VERSION=4.9.4 \
        --env AWS_REGION=us-east-1 \
        --env ECR_REGISTRY=762233763891.dkr.ecr.us-east-1.amazonaws.com \
        --env ECR_REPOSITORY=soundbite-development-api \
        --env AWS_ACCESS_KEY_ID=test \
        --env AWS_SECRET_ACCESS_KEY=test \
        --env AWS_ENDPOINT=http://localhost:4566 \
        --verbose
}

# Test CD workflow
test_cd_workflow() {
    echo -e "${BLUE}🧪 Testing CD Workflow...${NC}"
    
    # Test with workflow_run event
    act workflow_run -W .github/workflows/cd-staging-prod.yml \
        --eventpath .github/events/workflow-run-success.json \
        --platform ubuntu-latest=catthehacker/ubuntu:act-latest \
        --artifact-server-path /tmp/artifacts \
        --env AWS_REGION=us-east-1 \
        --env ECR_REGISTRY=762233763891.dkr.ecr.us-east-1.amazonaws.com \
        --env ECR_REPOSITORY=soundbite-development-api \
        --verbose
}

# Test specific job
test_job() {
    local workflow_file=$1
    local job_name=$2
    local event_file=$3
    
    echo -e "${BLUE}🧪 Testing Job: ${job_name} in ${workflow_file}...${NC}"
    
    act push -W "${workflow_file}" \
        --eventpath "${event_file}" \
        --platform ubuntu-latest=catthehacker/ubuntu:act-latest \
        --artifact-server-path /tmp/artifacts \
        --job "${job_name}" \
        --env NODE_VERSION=22 \
        --env YARN_VERSION=4.9.4 \
        --env AWS_REGION=us-east-1 \
        --env ECR_REGISTRY=762233763891.dkr.ecr.us-east-1.amazonaws.com \
        --env ECR_REPOSITORY=soundbite-development-api \
        --env AWS_ACCESS_KEY_ID=test \
        --env AWS_SECRET_ACCESS_KEY=test \
        --env AWS_ENDPOINT=http://localhost:4566 \
        --verbose
}

# Create event files
create_event_files() {
    echo -e "${YELLOW}📝 Creating event files...${NC}"
    
    mkdir -p .github/events
    
    # Dev push event
    cat > .github/events/dev-push.json << 'EOF'
{
  "ref": "refs/heads/dev",
  "head_ref": "dev",
  "repository": {
    "name": "SoundBite",
    "full_name": "SinaVosooghi/SoundBite"
  },
  "pusher": {
    "name": "test-user",
    "email": "test@example.com"
  },
  "commits": [
    {
      "id": "abc123",
      "message": "Test commit",
      "timestamp": "2025-09-19T10:00:00Z"
    }
  ]
}
EOF

    # Staging push event
    cat > .github/events/staging-push.json << 'EOF'
{
  "ref": "refs/heads/staging",
  "head_ref": "staging",
  "repository": {
    "name": "SoundBite",
    "full_name": "SinaVosooghi/SoundBite"
  },
  "pusher": {
    "name": "test-user",
    "email": "test@example.com"
  },
  "commits": [
    {
      "id": "def456",
      "message": "Test staging commit",
      "timestamp": "2025-09-19T10:00:00Z"
    }
  ]
}
EOF

    # Production push event
    cat > .github/events/production-push.json << 'EOF'
{
  "ref": "refs/heads/master",
  "head_ref": "master",
  "repository": {
    "name": "SoundBite",
    "full_name": "SinaVosooghi/SoundBite"
  },
  "pusher": {
    "name": "test-user",
    "email": "test@example.com"
  },
  "commits": [
    {
      "id": "ghi789",
      "message": "Test production commit",
      "timestamp": "2025-09-19T10:00:00Z"
    }
  ]
}
EOF

    # Workflow run success event
    cat > .github/events/workflow-run-success.json << 'EOF'
{
  "action": "completed",
  "workflow_run": {
    "id": 123456,
    "name": "Staging/Production CI (Build & Test + Push)",
    "head_branch": "staging",
    "head_sha": "def456",
    "conclusion": "success",
    "status": "completed"
  },
  "repository": {
    "name": "SoundBite",
    "full_name": "SinaVosooghi/SoundBite"
  }
}
EOF

    echo -e "${GREEN}✅ Event files created${NC}"
}

# Clean up
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    rm -rf .github/events
    rm -rf /tmp/artifacts
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Show help
show_help() {
    echo -e "${BLUE}SoundBite Local GitHub Actions Testing${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS] [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev                 Test dev CI workflow"
    echo "  staging             Test staging CI workflow"
    echo "  production          Test production CI workflow"
    echo "  cd                  Test CD workflow"
    echo "  all                 Test all workflows"
    echo "  job <workflow> <job> <event>  Test specific job"
    echo "  setup               Install act and create event files"
    echo "  cleanup             Clean up temporary files"
    echo "  help                Show this help"
    echo ""
    echo "Options:"
    echo "  --install           Install act if not present"
    echo "  --no-docker-check   Skip Docker check"
    echo ""
    echo "Examples:"
    echo "  $0 setup"
    echo "  $0 dev"
    echo "  $0 all"
    echo "  $0 job .github/workflows/ci-dev.yml test .github/events/dev-push.json"
}

# Main function
main() {
    local install_act_flag=false
    local no_docker_check=false
    local command=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --install)
                install_act_flag=true
                shift
                ;;
            --no-docker-check)
                no_docker_check=true
                shift
                ;;
            help|--help|-h)
                show_help
                exit 0
                ;;
            *)
                command=$1
                shift
                ;;
        esac
    done
    
    # Install act if requested
    if [[ "$install_act_flag" == "true" ]]; then
        install_act
    fi
    
    # Check prerequisites
    check_act
    if [[ "$no_docker_check" != "true" ]]; then
        check_docker
    fi
    
    # Create event files
    create_event_files
    
    # Execute command
    case $command in
        setup)
            echo -e "${GREEN}✅ Setup complete${NC}"
            ;;
        dev)
            test_dev_workflow
            ;;
        staging)
            test_staging_workflow
            ;;
        production)
            test_production_workflow
            ;;
        cd)
            test_cd_workflow
            ;;
        all)
            echo -e "${BLUE}🧪 Testing all workflows...${NC}"
            test_dev_workflow
            echo ""
            test_staging_workflow
            echo ""
            test_production_workflow
            echo ""
            test_cd_workflow
            ;;
        job)
            if [[ $# -lt 3 ]]; then
                echo -e "${RED}❌ Usage: $0 job <workflow> <job> <event>${NC}"
                exit 1
            fi
            test_job "$1" "$2" "$3"
            ;;
        cleanup)
            cleanup
            ;;
        "")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $command${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
