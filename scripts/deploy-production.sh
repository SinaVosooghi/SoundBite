#!/bin/bash
# Deploy Production Environment Only

echo "🚀 Deploying Production Environment..."

# 1. Build production image
echo "📦 Building production Docker image..."
docker build -f Dockerfile.production -t soundbite:production .

# 2. Push to ECR
echo "⬆️  Pushing production image to ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 762233763891.dkr.ecr.us-east-1.amazonaws.com
docker tag soundbite:production 762233763891.dkr.ecr.us-east-1.amazonaws.com/soundbite-development-api:production
docker push 762233763891.dkr.ecr.us-east-1.amazonaws.com/soundbite-development-api:production

echo "✅ Production deployment complete!"
echo "🌐 Test with: curl http://[EC2-IP]/prod/"
