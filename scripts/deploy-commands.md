# 🚀 Clean Multi-Environment Commands

## **🌍 Development Environment (Local)**

### **Start with LocalStack (Default)**
```bash
# Use the main script
./scripts/soundbite.sh dev localstack

# Or run directly
export AWS_CONNECTION_MODE=localstack
yarn start:dev
```

### **Start with Real AWS Services**
```bash
# Use the main script
./scripts/soundbite.sh dev aws

# Or run directly
export AWS_CONNECTION_MODE=aws
yarn start:dev
```

## **🚀 Staging Environment (AWS)**

### **Build & Deploy Staging**
```bash
# Use the main script
./scripts/soundbite.sh deploy staging

# Or use individual commands
./scripts/soundbite.sh build staging
./scripts/deploy-staging.sh
```

### **Manual Staging Deployment**
```bash
# Build staging image
docker build -f Dockerfile.staging -t soundbite:staging .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 762233763891.dkr.ecr.us-east-1.amazonaws.com
docker tag soundbite:staging 762233763891.dkr.ecr.us-east-1.amazonaws.com/soundbite-multienv-api:staging
docker push 762233763891.dkr.ecr.us-east-1.amazonaws.com/soundbite-multienv-api:staging
```

## **🚀 Production Environment (AWS)**

### **Build & Deploy Production**
```bash
# Use the main script
./scripts/soundbite.sh deploy production

# Or use individual commands
./scripts/soundbite.sh build production
./scripts/deploy-production.sh
```

### **Manual Production Deployment**
```bash
# Build production image
docker build -f Dockerfile.production -t soundbite:production .

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 762233763891.dkr.ecr.us-east-1.amazonaws.com
docker tag soundbite:production 762233763891.dkr.ecr.us-east-1.amazonaws.com/soundbite-multienv-api:production
docker push 762233763891.dkr.ecr.us-east-1.amazonaws.com/soundbite-multienv-api:production
```

## **🏗️ AWS Infrastructure Management**

### **Deploy All CDK Stacks**
```bash
# Use the main script
./scripts/soundbite.sh cdk deploy

# Or run manually
cd cdk
npx cdk deploy --app "npx ts-node bin/soundbite-multienv.ts" --all --require-approval never
cd ..
```

### **Destroy All CDK Stacks**
```bash
# Use the main script
./scripts/soundbite.sh cdk destroy

# Or run manually
cd cdk
npx cdk destroy --app "npx ts-node bin/soundbite-multienv.ts" --all --force
cd ..
```

## **🧪 Testing & Status**

### **Run Tests**
```bash
# Use the main script
./scripts/soundbite.sh test

# Or run directly
yarn test
```

### **Check System Status**
```bash
./scripts/soundbite.sh status
```

### **Test Endpoints**
```bash
# Test staging
curl http://52.91.104.44/staging/

# Test production
curl http://52.91.104.44/prod/
```

---

## **🎯 Why This Structure?**

✅ **Single Entry Point**: `./scripts/soundbite.sh` for all operations  
✅ **Clear Commands**: Each environment has its own deployment path  
✅ **No Duplication**: Removed redundant scripts  
✅ **Yarn Only**: Uses yarn, not npm  
✅ **Environment Aware**: Automatically detects and configures environment  

## **🚀 Quick Start Examples**

```bash
# Development with LocalStack
./scripts/soundbite.sh dev localstack

# Development with Real AWS
./scripts/soundbite.sh dev aws

# Deploy staging
./scripts/soundbite.sh deploy staging

# Deploy production
./scripts/soundbite.sh deploy production

# Build all images
./scripts/soundbite.sh build all

# Deploy AWS infrastructure
./scripts/soundbite.sh cdk deploy
```

---

**🎯 This structure gives you exactly what was planned: separate deployments for staging/production + 2 development options (LocalStack/Real AWS)!**
