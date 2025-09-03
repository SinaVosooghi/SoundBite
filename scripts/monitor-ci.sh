#!/bin/bash

# CI/CD Monitoring Script
# This script monitors the GitHub Actions workflow status

set -e

echo "🔍 CI/CD Pipeline Monitor"
echo "========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Get repository info
REPO_URL=$(git config --get remote.origin.url)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
LATEST_COMMIT=$(git rev-parse HEAD)
SHORT_COMMIT=$(git rev-parse --short HEAD)

print_info "Repository: $REPO_URL"
print_info "Branch: $CURRENT_BRANCH"
print_info "Latest commit: $SHORT_COMMIT"

echo ""
print_info "Checking CI/CD status..."

# Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    echo ""
    print_info "Using GitHub CLI to check workflow status..."
    
    # Get latest workflow runs
    echo "Latest workflow runs:"
    gh run list --limit 5 --json status,conclusion,name,createdAt,url | \
    jq -r '.[] | "\(.status) | \(.conclusion // "N/A") | \(.name) | \(.createdAt) | \(.url)"' | \
    while IFS='|' read -r status conclusion name created_at url; do
        status=$(echo "$status" | xargs)
        conclusion=$(echo "$conclusion" | xargs)
        name=$(echo "$name" | xargs)
        created_at=$(echo "$created_at" | xargs)
        url=$(echo "$url" | xargs)
        
        if [ "$status" = "completed" ]; then
            if [ "$conclusion" = "success" ]; then
                echo -e "${GREEN}✓${NC} $name - $conclusion ($created_at)"
            elif [ "$conclusion" = "failure" ]; then
                echo -e "${RED}✗${NC} $name - $conclusion ($created_at)"
                echo "   View details: $url"
            else
                echo -e "${YELLOW}⚠${NC} $name - $conclusion ($created_at)"
            fi
        else
            echo -e "${BLUE}⏳${NC} $name - $status ($created_at)"
        fi
    done
    
    echo ""
    print_info "Watching latest workflow run..."
    
    # Watch the latest run
    if gh run watch --exit-status; then
        print_status "Workflow completed successfully!"
    else
        print_error "Workflow failed or was cancelled"
        echo ""
        print_info "Getting failure details..."
        gh run view --log-failed
    fi
    
else
    print_warning "GitHub CLI not available. Install with: brew install gh"
    echo ""
    print_info "Manual monitoring URLs:"
    
    if [[ $REPO_URL == *"github.com"* ]]; then
        # Extract owner/repo from URL
        if [[ $REPO_URL == *".git" ]]; then
            REPO_PATH=${REPO_URL%.git}
        else
            REPO_PATH=$REPO_URL
        fi
        
        if [[ $REPO_PATH == *"github.com/"* ]]; then
            REPO_PATH=${REPO_PATH#*github.com/}
            REPO_PATH=${REPO_PATH#*github.com:}
            
            echo "Actions: https://github.com/$REPO_PATH/actions"
            echo "Latest commit: https://github.com/$REPO_PATH/commit/$LATEST_COMMIT"
            echo "Branch: https://github.com/$REPO_PATH/tree/$CURRENT_BRANCH"
        fi
    fi
fi

echo ""
print_info "Monitoring complete. Check the URLs above for detailed status."