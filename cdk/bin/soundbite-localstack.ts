#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { QueueStack } from '../lib/queue-stack';
import { ComputeStack } from '../lib/compute-stack';

const app = new cdk.App();

// LocalStack-specific configuration
const localstackConfig = {
  projectName: 'SoundBite',
  environment: 'development-localstack',
  enableMultiEnvironment: true,
  description: 'SoundBite LocalStack Development Environment',
  tags: {
    Environment: 'development-localstack',
    Project: 'SoundBite',
    Purpose: 'LocalStack Development',
    CostCenter: 'development'
  }
};

// Create stacks optimized for LocalStack
const databaseStack = new DatabaseStack(app, 'SoundBite-LocalStack-Database', {
  ...localstackConfig,
  env: {
    account: '000000000000', // LocalStack default account
    region: 'us-east-1'
  }
});

const storageStack = new StorageStack(app, 'SoundBite-LocalStack-Storage', {
  ...localstackConfig,
  env: {
    account: '000000000000', // LocalStack default account
    region: 'us-east-1'
  }
});

const queueStack = new QueueStack(app, 'SoundBite-LocalStack-Queue', {
  ...localstackConfig,
  env: {
    account: '000000000000', // LocalStack default account
    region: 'us-east-1'
  }
});

const computeStack = new ComputeStack(app, 'SoundBite-LocalStack-Compute', {
  ...localstackConfig,
  env: {
    account: '000000000000', // LocalStack default account
    region: 'us-east-1'
  },
  databaseTable: databaseStack.table,
  storageBucket: storageStack.bucket,
  messageQueue: queueStack.queue,
});

// Set up dependencies
storageStack.addDependency(databaseStack);
queueStack.addDependency(databaseStack);
computeStack.addDependency(storageStack);
computeStack.addDependency(queueStack);

// Apply tags
cdk.Tags.of(app).add('Environment', 'development-localstack');
cdk.Tags.of(app).add('Project', 'SoundBite');
cdk.Tags.of(app).add('Purpose', 'LocalStack Development');

console.log('🚀 LocalStack CDK App initialized');
console.log('📦 Stacks to deploy:');
console.log('  - SoundBite-LocalStack-Database');
console.log('  - SoundBite-LocalStack-Storage');
console.log('  - SoundBite-LocalStack-Queue');
console.log('  - SoundBite-LocalStack-Compute');
console.log('');
console.log('🔧 Deploy with: cdklocal deploy --all');
console.log('🧹 Clean up with: cdklocal destroy --all');
