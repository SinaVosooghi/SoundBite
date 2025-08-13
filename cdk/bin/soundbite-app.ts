#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { QueueStack } from '../lib/queue-stack';
import { ComputeStack } from '../lib/compute-stack';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '000000000001',
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Stack configuration
const stackConfig = {
  projectName: 'SoundBite',
  environment: 'production',
  ...env,
};

// Individual service stacks for better observability and debugging
const databaseStack = new DatabaseStack(app, `${stackConfig.projectName}-Database`, {
  ...stackConfig,
  description: 'SoundBite Database Stack (DynamoDB)',
});

const storageStack = new StorageStack(app, `${stackConfig.projectName}-Storage`, {
  ...stackConfig,
  description: 'SoundBite Storage Stack (S3)',
});

const queueStack = new QueueStack(app, `${stackConfig.projectName}-Queue`, {
  ...stackConfig,
  description: 'SoundBite Queue Stack (SQS)',
});

const computeStack = new ComputeStack(app, `${stackConfig.projectName}-Compute`, {
  ...stackConfig,
  description: 'SoundBite Compute Stack (Lambda + ECR)',
  databaseTable: databaseStack.table,
  storageBucket: storageStack.bucket,
  messageQueue: queueStack.queue,
});

const apiStack = new ApiStack(app, `${stackConfig.projectName}-API`, {
  ...stackConfig,
  description: 'SoundBite API Stack (EC2 + API Gateway)',
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
  Environment: stackConfig.environment,
  ManagedBy: 'CDK',
};

[databaseStack, storageStack, queueStack, computeStack, apiStack].forEach(stack => {
  cdk.Tags.of(stack).add('Project', tags.Project);
  cdk.Tags.of(stack).add('Environment', tags.Environment);
  cdk.Tags.of(stack).add('ManagedBy', tags.ManagedBy);
});

app.synth(); 