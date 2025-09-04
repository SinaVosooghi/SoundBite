# Local Development Setup

## Prerequisites

- Node.js 22 or higher
- Yarn 4.9.4 or higher
- AWS CLI configured
- Git

## Development Environment Setup

### 1. Clone and Install
```bash
git clone https://github.com/SinaVosooghi/SoundBite.git
cd SoundBite
yarn install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start LocalStack (Optional)
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

### 4. Run Development Server
```bash
yarn dev
```

## Development Workflow

### 1. Code Changes
- Make changes to source code
- Run tests: `yarn test`
- Run linting: `yarn lint`
- Format code: `yarn format`

### 2. Testing
- Unit tests: `yarn test`
- Integration tests: `yarn test:integration`
- Coverage: `yarn test:coverage`

### 3. Documentation
- Update docs: `yarn docs:update`
- Validate docs: `yarn docs:validate`

## Development Tools

### VS Code Extensions
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- GitLens

### Debugging
- Set breakpoints in VS Code
- Use `yarn dev` for hot reloading
- Check logs with `yarn logs`

## Troubleshooting

### Common Issues
1. **Port already in use**: Change PORT in .env
2. **AWS credentials**: Run `aws configure`
3. **LocalStack issues**: Restart LocalStack
4. **Dependencies**: Run `yarn install`

### Getting Help
- Check logs: `yarn logs`
- Run health check: `yarn health`
- Validate setup: `yarn docs:validate`
