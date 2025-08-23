#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { QueueStack } from '../lib/queue-stack';
import { ComputeStack } from '../lib/compute-stack';
import { ApiStack } from '../lib/api-stack';
import { getEnvironmentConfig, getAllEnvironments } from '../config';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '000000000001',
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Get target environment from command line or environment variable
const targetEnv = process.env.CDK_ENVIRONMENT || process.argv[2] || 'development';
const validEnvironments = getAllEnvironments();

if (!validEnvironments.includes(targetEnv)) {
  console.error(`Invalid environment: ${targetEnv}`);
  console.error(`Valid environments: ${validEnvironments.join(', ')}`);
  process.exit(1);
}

const environmentConfig = getEnvironmentConfig(targetEnv);

// Stack configuration
const stackConfig = {
  projectName: 'SoundBite',
  environment: targetEnv,
  environmentConfig,
  ...env,
};

console.log(`Deploying ${stackConfig.projectName} to ${targetEnv} environment`);
console.log(`Environment config:`, environmentConfig);

// Individual service stacks for better observability and debugging
const databaseStack = new DatabaseStack(app, `${stackConfig.projectName}-${environmentConfig.prefix}-Database`, {
  ...stackConfig,
  description: `SoundBite Database Stack (DynamoDB) - ${targetEnv}`,
});

const storageStack = new StorageStack(app, `${stackConfig.projectName}-${environmentConfig.prefix}-Storage`, {
  ...stackConfig,
  description: `SoundBite Storage Stack (S3) - ${targetEnv}`,
});

const queueStack = new QueueStack(app, `${stackConfig.projectName}-${environmentConfig.prefix}-Queue`, {
  ...stackConfig,
  description: `SoundBite Queue Stack (SQS) - ${targetEnv}`,
});

const computeStack = new ComputeStack(app, `${stackConfig.projectName}-${environmentConfig.prefix}-Compute`, {
  ...stackConfig,
  description: `SoundBite Compute Stack (Lambda + ECR) - ${targetEnv}`,
  databaseTable: databaseStack.table,
  storageBucket: storageStack.bucket,
  messageQueue: queueStack.queue,
});

const apiStack = new ApiStack(app, `${stackConfig.projectName}-${environmentConfig.prefix}-API`, {
  ...stackConfig,
  description: `SoundBite API Stack (EC2 + API Gateway) - ${targetEnv}`,
  databaseTable: databaseStack.table,
  storageBucket: storageStack.bucket,
  messageQueue: queueStack.queue,
  ecrRepository: computeStack.ecrRepository,
});

// Add dependencies for proper deployment order
apiStack.addDependency(computeStack);
computeStack.addDependency(databaseStack);
computeStack.addDependency(storageStack);
computeStack.addDependency(queueStack);

// Add tags for better resource management
const tags = {
  Project: stackConfig.projectName,
  Environment: targetEnv,
  EnvironmentPrefix: environmentConfig.prefix,
  ManagedBy: 'CDK',
};

[databaseStack, storageStack, queueStack, computeStack, apiStack].forEach(stack => {
  cdk.Tags.of(stack).add('Project', tags.Project);
  cdk.Tags.of(stack).add('Environment', tags.Environment);
  cdk.Tags.of(stack).add('EnvironmentPrefix', tags.EnvironmentPrefix);
  cdk.Tags.of(stack).add('ManagedBy', tags.ManagedBy);
});

app.synth(); 