# SoundBite Installation Guide

## System Requirements

### Minimum Requirements
- **Node.js**: 22.0.0 or higher
- **Yarn**: 4.9.4 or higher
- **AWS CLI**: 2.0.0 or higher
- **Git**: 2.30.0 or higher
- **Memory**: 4GB RAM
- **Storage**: 2GB free space

### Recommended Requirements
- **Node.js**: 22.6.0 or higher
- **Yarn**: 4.9.4 or higher
- **AWS CLI**: 2.13.0 or higher
- **Git**: 2.40.0 or higher
- **Memory**: 8GB RAM
- **Storage**: 5GB free space

## Installation Steps

### 1. Install Node.js

#### Using Node Version Manager (Recommended)
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js 22
nvm install 22
nvm use 22
```

#### Using Package Manager
```bash
# macOS (using Homebrew)
brew install node@22

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows (using Chocolatey)
choco install nodejs --version=22.6.0
```

### 2. Install Yarn

#### Using Corepack (Recommended)
```bash
# Enable corepack
corepack enable

# Install Yarn 4.9.4
corepack prepare yarn@4.9.4 --activate
```

#### Using Package Manager
```bash
# macOS (using Homebrew)
brew install yarn

# Ubuntu/Debian
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt-get update && sudo apt-get install yarn

# Windows (using Chocolatey)
choco install yarn
```

### 3. Install AWS CLI

#### macOS
```bash
# Using Homebrew
brew install awscli

# Using pip
pip3 install awscli
```

#### Linux
```bash
# Using pip
pip3 install awscli

# Using package manager
sudo apt-get install awscli
```

#### Windows
```bash
# Using Chocolatey
choco install awscli

# Using MSI installer
# Download from https://aws.amazon.com/cli/
```

### 4. Install Git

#### macOS
```bash
# Using Homebrew
brew install git

# Using Xcode Command Line Tools
xcode-select --install
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get install git

# CentOS/RHEL
sudo yum install git
```

#### Windows
```bash
# Using Chocolatey
choco install git

# Download from https://git-scm.com/
```

## Project Setup

### 1. Clone the Repository
```bash
git clone https://github.com/SinaVosooghi/SoundBite.git
cd SoundBite
```

### 2. Install Dependencies
```bash
# Install main dependencies
yarn install

# Install CDK dependencies
cd cdk
yarn install
cd ..
```

### 3. Set Up Environment Variables
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

#### Required Environment Variables
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id

# Application Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
DYNAMODB_TABLE_NAME=SoundBite-dev-SoundbitesTable
S3_BUCKET_NAME=soundbite-dev-soundbites
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/your-account-id/SoundBite-dev-Queue
```

### 4. Configure AWS Credentials
```bash
# Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

## Infrastructure Setup

### 1. Deploy AWS Infrastructure
```bash
# Navigate to CDK directory
cd cdk

# Bootstrap CDK (first time only)
npx cdk bootstrap

# Deploy infrastructure
npx cdk deploy

# Return to project root
cd ..
```

### 2. Verify Deployment
```bash
# Check AWS resources
aws cloudformation list-stacks --query 'StackSummaries[?contains(StackName, `SoundBite`)].{StackName:StackName,StackStatus:StackStatus}' --output table

# Check Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `SoundBite`)].{FunctionName:FunctionName,Runtime:Runtime,State:State}' --output table
```

## Application Setup

### 1. Start the Application
```bash
# Development mode
yarn dev

# Production mode
yarn start
```

### 2. Verify Installation
```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-09-04T15:30:00.000Z",
  "version": "1.0.0"
}
```

### 3. Run Tests
```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run integration tests
yarn test:integration
```

## Development Environment

### 1. Set Up LocalStack (Optional)
```bash
# Install LocalStack
pip3 install localstack

# Start LocalStack
localstack start

# Set environment variables
export AWS_ENDPOINT=http://localhost:4566
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
```

### 2. Configure IDE
#### VS Code
```bash
# Install recommended extensions
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-eslint
```

#### WebStorm
```bash
# Enable TypeScript support
# Configure ESLint and Prettier
# Set up debugging configuration
```

## Troubleshooting

### Common Issues

#### 1. Node.js Version Issues
```bash
# Check Node.js version
node --version

# Should be 22.x.x
# If not, install correct version
nvm install 22
nvm use 22
```

#### 2. Yarn Version Issues
```bash
# Check Yarn version
yarn --version

# Should be 4.9.4
# If not, install correct version
corepack prepare yarn@4.9.4 --activate
```

#### 3. AWS Credentials Issues
```bash
# Check AWS credentials
aws sts get-caller-identity

# Should return your AWS account information
# If not, configure credentials
aws configure
```

#### 4. Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 yarn start
```

### Getting Help

- **📚 [Documentation](https://github.com/SinaVosooghi/SoundBite/tree/main/docs)**: Complete documentation
- **🐛 [Issues](https://github.com/SinaVosooghi/SoundBite/issues)**: Report bugs or ask questions
- **💬 [Discussions](https://github.com/SinaVosooghi/SoundBite/discussions)**: Community discussions
- **📖 [Wiki](https://github.com/SinaVosooghi/SoundBite/wiki)**: Additional resources

## Next Steps

- **🎵 [First SoundBite](first-soundbite.md)**: Process your first audio file
- **🏗️ [Architecture Overview](../architecture/system-overview.md)**: Understand the system
- **🔧 [Development Guide](../development/local-setup.md)**: Set up development environment
- **📊 [Monitoring Guide](../operations/monitoring.md)**: Set up monitoring
