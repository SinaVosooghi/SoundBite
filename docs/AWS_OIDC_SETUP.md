# AWS OIDC Setup Guide for GitHub Actions

_Last updated: September 2025_

## 🎯 **Overview**

This guide walks through setting up AWS OIDC (OpenID Connect) for GitHub Actions, eliminating the need for long-lived AWS access keys and providing secure, short-lived credentials for CI/CD pipelines.

## 🔧 **Prerequisites**

- AWS Account with administrative access
- GitHub repository with Actions enabled
- AWS CLI configured locally (optional, for verification)

## 📋 **Step 1: Create IAM Identity Provider**

### 1.1 Navigate to IAM Console
1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **Identity providers** in the left sidebar
3. Click **Create provider**

### 1.2 Configure OIDC Provider
- **Provider type**: OpenID Connect
- **Provider URL**: `https://token.actions.githubusercontent.com`
- **Audience**: `sts.amazonaws.com`
- **Provider name**: `GitHub-Actions-OIDC`

### 1.3 Verify and Create
- Click **Next** to review
- Click **Create provider**

## 🏗️ **Step 2: Create IAM Roles**

### 2.1 Development Role

Create a role for development deployments:

**Role Name**: `GitHubActions-SoundBite-Dev`

**Trust Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GitHubOIDCTrust",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:SinaVosooghi/SoundBite:ref:refs/heads/master",
            "repo:SinaVosooghi/SoundBite:ref:refs/heads/develop"
          ]
        }
      }
    }
  ]
}
```

**Attached Policies**:
- `PowerUserAccess` (for development)
- Custom policy for CDK deployment (see below)

### 2.2 Production Role

Create a role for production deployments:

**Role Name**: `GitHubActions-SoundBite-Prod`

**Trust Policy**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GitHubOIDCTrust",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:SinaVosooghi/SoundBite:ref:refs/tags/v*"
          ]
        }
      }
    }
  ]
}
```

**Attached Policies**:
- `PowerUserAccess` (for production)
- Custom policy for CDK deployment (see below)

### 2.3 Custom CDK Policy

Create a custom policy for CDK deployment:

**Policy Name**: `SoundBite-CDK-Deployment`

**Policy Document**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "iam:*",
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "sqs:*",
        "sns:*",
        "logs:*",
        "cloudwatch:*",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🔐 **Step 3: Configure GitHub Repository**

### 3.1 Add Repository Variables

Go to **Settings** → **Secrets and variables** → **Actions** → **Variables** tab:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `AWS_REGION` | `us-east-1` | AWS region for deployments |
| `AWS_ACCOUNT_ID_DEV` | `YOUR_DEV_ACCOUNT_ID` | Development AWS account ID |
| `AWS_ACCOUNT_ID_PROD` | `YOUR_PROD_ACCOUNT_ID` | Production AWS account ID |
| `CDK_STACKS` | `SoundBiteApiStack` | CDK stack names to deploy |

### 3.2 Create Environments

1. Go to **Settings** → **Environments**
2. Create **dev** environment
3. Create **prod** environment with **Required reviewers**

## 🚀 **Step 4: Update GitHub Actions Workflows**

### 4.1 Update CI Workflow

The CI workflow should use LocalStack for integration tests:

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
    branches: [ master ]
permissions:
  contents: read
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      localstack:
        image: localstack/localstack:3
        ports: [ "4566:4566" ]
        env:
          SERVICES: s3,sqs,dynamodb,sts
        options: >-
          --health-cmd="curl -s http://localhost:4566/_localstack/health | jq -e '.services.s3 == \"running\"'"
          --health-interval=5s --health-timeout=2m --health-retries=30
    env:
      AWS_REGION: us-east-1
      AWS_ACCESS_KEY_ID: test
      AWS_SECRET_ACCESS_KEY: test
      AWS_ENDPOINT: http://localhost:4566
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: yarn
      - run: corepack enable
      - run: yarn install --immutable
      - run: yarn build --mode=ci
      - run: yarn test --ci --reporters=default --reporters=jest-junit
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage
```

### 4.2 Create Deploy Development Workflow

```yaml
# .github/workflows/deploy-dev.yml
name: Deploy (dev)
on:
  push:
    branches: [ master ]
permissions:
  id-token: write   # required for OIDC
  contents: read
concurrency:
  group: deploy-dev
  cancel-in-progress: true
env:
  AWS_REGION: ${{ vars.AWS_REGION }}
  AWS_ACCOUNT_ID: ${{ vars.AWS_ACCOUNT_ID_DEV }}
  CDK_STACKS: ${{ vars.CDK_STACKS }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: yarn
      - run: corepack enable
      - run: yarn install --immutable
      - name: Configure AWS creds (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ env.AWS_ACCOUNT_ID }}:role/GitHubActions-SoundBite-Dev
          aws-region: ${{ env.AWS_REGION }}
      - name: CDK synth
        working-directory: cdk
        run: |
          yarn install --immutable
          npx cdk synth
      - name: CDK deploy
        working-directory: cdk
        run: |
          npx cdk deploy $CDK_STACKS --require-approval never
```

### 4.3 Create Deploy Production Workflow

```yaml
# .github/workflows/deploy-prod.yml
name: Deploy (prod)
on:
  push:
    tags: [ "v*" ]
permissions:
  id-token: write
  contents: read
env:
  AWS_REGION: ${{ vars.AWS_REGION }}
  AWS_ACCOUNT_ID: ${{ vars.AWS_ACCOUNT_ID_PROD }}
  CDK_STACKS: ${{ vars.CDK_STACKS }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: prod   # set a required reviewer in repo > Environments > prod
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: yarn }
      - run: corepack enable
      - run: yarn install --immutable
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::${{ env.AWS_ACCOUNT_ID }}:role/GitHubActions-SoundBite-Prod
          aws-region: ${{ env.AWS_REGION }}
      - run: npx cdk synth
        working-directory: cdk
      - run: npx cdk deploy $CDK_STACKS --require-approval never
        working-directory: cdk
```

## ✅ **Step 5: Verification**

### 5.1 Test OIDC Connection

**Note**: Due to GitHub Environment context issues with OIDC, we use direct AWS CLI calls instead of the GitHub Action.

Create a test workflow to verify OIDC is working:

```yaml
# .github/workflows/test-oidc.yml
name: Test OIDC
on:
  workflow_dispatch:
permissions:
  id-token: write
  contents: read
env:
  AWS_REGION: ${{ vars.AWS_REGION }}
  AWS_ACCOUNT_ID: ${{ vars.AWS_ACCOUNT_ID_DEV }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials (OIDC via CLI)
        run: |
          echo "🔍 Configuring AWS credentials via OIDC..."
          
          # Get the OIDC token
          TOKEN=$(curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com" | jq -r .value)
          
          # Assume the role
          CREDS=$(aws sts assume-role-with-web-identity \
            --role-arn arn:aws:iam::${{ env.AWS_ACCOUNT_ID }}:role/GitHubActions-SoundBite-Dev \
            --web-identity-token $TOKEN \
            --role-session-name github-actions-test \
            --region ${{ env.AWS_REGION }} \
            --output json)
          
          # Extract credentials
          ACCESS_KEY=$(echo $CREDS | jq -r '.Credentials.AccessKeyId')
          SECRET_KEY=$(echo $CREDS | jq -r '.Credentials.SecretAccessKey')
          SESSION_TOKEN=$(echo $CREDS | jq -r '.Credentials.SessionToken')
          
          # Set environment variables
          echo "AWS_ACCESS_KEY_ID=$ACCESS_KEY" >> $GITHUB_ENV
          echo "AWS_SECRET_ACCESS_KEY=$SECRET_KEY" >> $GITHUB_ENV
          echo "AWS_SESSION_TOKEN=$SESSION_TOKEN" >> $GITHUB_ENV
          echo "AWS_DEFAULT_REGION=${{ env.AWS_REGION }}" >> $GITHUB_ENV
          
          echo "✅ AWS credentials configured successfully!"
      - name: Test AWS connection
        run: |
          aws sts get-caller-identity
          echo "✅ OIDC connection successful!"
```

### 5.2 Verify Role Assumption

The output should show:
```json
{
    "UserId": "AROAXXXXXXXXXXXXXXXXX:github-actions",
    "Account": "123456789012",
    "Arn": "arn:aws:sts::123456789012:assumed-role/GitHubActions-SoundBite-Dev/github-actions"
}
```

## 🔒 **Security Best Practices**

### 5.1 Least Privilege Principle
- Use specific IAM policies instead of broad permissions
- Regularly audit and rotate policies
- Use separate roles for different environments

### 5.2 Trust Policy Restrictions
- Lock trust policies to specific repositories
- Use branch/tag restrictions in conditions
- Regularly review and update trust policies

### 5.3 Monitoring
- Enable CloudTrail for role assumption events
- Set up CloudWatch alarms for unusual activity
- Monitor GitHub Actions logs for errors

## 🚨 **Troubleshooting**

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `Could not load credentials` | Missing OIDC permissions | Add `permissions.id-token: write` |
| `AccessDenied` | Wrong role ARN | Verify role ARN and trust policy |
| `AssumeRole not authorized` | Trust policy mismatch | Check `sub` condition in trust policy |
| `Invalid audience` | Wrong audience | Use `sts.amazonaws.com` |
| `GitHub Environment OIDC failure` | Environment context interference | Use direct AWS CLI calls instead of GitHub Action |
| `aws-actions/configure-aws-credentials@v4 fails` | GitHub Action compatibility issue | Replace with direct AWS CLI authentication |

### GitHub Environment Context Issue

**Problem**: GitHub Environments can interfere with OIDC token generation, causing authentication failures.

**Symptoms**:
- OIDC works without environment context
- OIDC fails with environment context
- `aws-actions/configure-aws-credentials@v4` returns "Not authorized"

**Solution**: Use direct AWS CLI calls instead of the GitHub Action:

```yaml
# Instead of:
- uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::ACCOUNT:role/ROLE
    aws-region: us-east-1

# Use:
- name: Configure AWS credentials (OIDC via CLI)
  run: |
    TOKEN=$(curl -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=sts.amazonaws.com" | jq -r .value)
    CREDS=$(aws sts assume-role-with-web-identity \
      --role-arn arn:aws:iam::ACCOUNT:role/ROLE \
      --web-identity-token $TOKEN \
      --role-session-name github-actions \
      --region us-east-1 \
      --output json)
    # Extract and set credentials...
```

### Debug Commands

```bash
# Check OIDC provider
aws iam get-open-id-connect-provider --open-id-connect-provider-arn arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com

# Check role trust policy
aws iam get-role --role-name GitHubActions-SoundBite-Dev

# Test role assumption
aws sts assume-role-with-web-identity --role-arn arn:aws:iam::ACCOUNT:role/GitHubActions-SoundBite-Dev --web-identity-token TOKEN --role-session-name test
```

## 📚 **Additional Resources**

- [GitHub OIDC Documentation](https://docs.github.com/en/actions/deployment/security/hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS IAM OIDC Guide](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [CDK Deployment Guide](https://docs.aws.amazon.com/cdk/v2/guide/deploy.html)
- [LocalStack GitHub Actions](https://docs.localstack.cloud/aws/integrations/continuous-integration/github-actions/)

---

**Next Steps**: After completing this setup, proceed to update the CI workflow with LocalStack integration and create the deploy workflows.
