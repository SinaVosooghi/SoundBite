#!/bin/bash

# CI/CD Push Automation Script
# This script runs local tests and pushes changes if everything passes

set -e

echo "🚀 CI/CD Push Automation"
echo "========================"

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

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes. Please commit them first."
    echo ""
    echo "Uncommitted changes:"
    git status --porcelain
    echo ""
    read -p "Do you want to commit all changes now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Enter commit message:"
        read -r commit_message
        git add -A
        git commit -m "$commit_message"
        print_status "Changes committed"
    else
        print_error "Please commit your changes first"
        exit 1
    fi
fi

# Get current branch (compatible with older git versions)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_info "Current branch: $CURRENT_BRANCH"

# Run local CI tests
echo ""
print_info "Running local CI tests..."
if ./scripts/ci-test.sh; then
    print_status "Local CI tests passed"
else
    print_error "Local CI tests failed"
    exit 1
fi

# Push to remote
echo ""
print_info "Pushing to remote repository..."
if git push origin "$CURRENT_BRANCH"; then
    print_status "Successfully pushed to origin/$CURRENT_BRANCH"
else
    print_error "Failed to push to remote"
    exit 1
fi

# Get the repository URL for GitHub Actions
REPO_URL=$(git config --get remote.origin.url)
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
        
        echo ""
        print_info "Monitor the CI/CD pipeline at:"
        echo "https://github.com/$REPO_PATH/actions"
        
        # Wait a moment for GitHub to register the push
        sleep 3
        
        print_info "Checking latest workflow run..."
        echo "You can also check the status with:"
        echo "gh run list --limit 1"
        echo "gh run watch"
    fi
fi

echo ""
print_status "Push automation completed successfully!"
print_info "Your changes are now being processed by the CI/CD pipeline."