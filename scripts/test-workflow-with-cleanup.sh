#!/bin/bash

# Test workflow with automatic Docker cleanup
# Usage: ./scripts/test-workflow-with-cleanup.sh [workflow-name]

set -e

WORKFLOW_NAME=${1:-"dev-ci"}
EVENT_FILE=".github/events/${WORKFLOW_NAME}-push.json"

echo "🧪 Testing $WORKFLOW_NAME workflow with automatic cleanup"
echo "=================================================="

# Pre-test cleanup
echo "🧹 Pre-test cleanup..."
./scripts/cleanup-docker.sh

# Test the workflow
echo "🚀 Running act test for $WORKFLOW_NAME..."
if act push -W ".github/workflows/${WORKFLOW_NAME}.yml" --eventpath "$EVENT_FILE"; then
    echo "✅ Workflow test completed"
else
    echo "❌ Workflow test failed"
    exit 1
fi

# Post-test cleanup
echo "🧹 Post-test cleanup..."
./scripts/cleanup-docker.sh

echo "✅ Test cycle completed with cleanup"
