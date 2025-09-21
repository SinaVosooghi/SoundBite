#!/bin/bash

# Docker cleanup script for CI/CD testing
# This script cleans up Docker containers and images to free up RAM

echo "🧹 Cleaning up Docker resources..."

# Stop and remove all running containers
echo "Stopping all containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

echo "Removing all containers..."
docker rm $(docker ps -aq) 2>/dev/null || true

# Remove unused images (dangling images)
echo "Removing unused images..."
docker image prune -f

# Remove unused build cache
echo "Removing build cache..."
docker builder prune -f

# Show remaining images
echo "Remaining Docker images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10

echo "✅ Docker cleanup completed"
