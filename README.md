# SoundBite 🎵

A simple NestJS audio processing service with AWS integration.

## Quick Start

### Prerequisites
- Node.js 22+
- Docker & Docker Compose
- AWS CLI (for deployment)
- Yarn 4

### Local Development (LocalStack)
```bash
# Start LocalStack
localstack start

# Setup and start app
./scripts/soundbite.sh setup
./scripts/soundbite.sh dev localstack

# Test
curl http://localhost:3000/health
```

### Local Development (AWS)
```bash
# Configure AWS credentials
aws configure

# Start app with real AWS
./scripts/soundbite.sh dev aws

# Test
curl http://localhost:3001/health
```

### Deploy to Staging
```bash
# Deploy infrastructure and app
./scripts/soundbite.sh deploy staging

# Test staging
curl http://54.204.75.210:3001/health
```

## What Works

✅ **LocalStack Development** - Full local development with LocalStack  
✅ **AWS Development** - Local app with real AWS services  
✅ **Staging Deployment** - Deployed to EC2 with CI/CD  
✅ **CI/CD Pipeline** - Automated testing and deployment  

## Architecture

```
Client → NestJS API → SQS → Lambda → AWS Polly → S3
                                                      ↓
                                                 DynamoDB (Metadata)
```

## Available Scripts

- `./scripts/soundbite.sh dev localstack` - Start with LocalStack
- `./scripts/soundbite.sh dev aws` - Start with real AWS
- `./scripts/soundbite.sh deploy staging` - Deploy to staging
- `./scripts/soundbite.sh setup` - Setup LocalStack

## Endpoints

- **Health**: `GET /health`
- **Create Soundbite**: `POST /soundbite`
- **API Docs**: `GET /api`

## Configuration

The app uses environment-specific configs in `src/config/environments/`:
- `development-localstack.config.ts` - LocalStack mode
- `development-aws.config.ts` - Local with AWS
- `staging.config.ts` - Staging deployment

## Troubleshooting

- **Port conflicts**: Check if ports 3000/3001 are in use
- **AWS credentials**: Run `aws sts get-caller-identity`
- **LocalStack**: Ensure LocalStack is running with `localstack status`