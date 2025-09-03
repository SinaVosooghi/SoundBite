#!/bin/bash
# Deploy Staging Environment Only

echo "🚀 Deploying Staging Environment..."

# 1. Build staging image
echo "📦 Building staging Docker image..."
docker build -f Dockerfile.staging -t soundbite:staging .

# 2. Push to ECR
echo "⬆️  Pushing staging image to ECR..."
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 762233763891.dkr.ecr.us-east-1.amazonaws.com
docker tag soundbite:staging 762233763891.dkr.ecr.us-east-1.amazonaws.com/soundbite-multienv-api:staging
docker push 762233763891.dkr.ecr.us-east-1.amazonaws.com/soundbite-multienv-api:staging

echo "✅ Staging deployment complete!"
echo "🌐 Test with: curl http://[EC2-IP]/staging/"
