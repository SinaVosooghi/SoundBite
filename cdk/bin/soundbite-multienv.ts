#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { QueueStack } from '../lib/queue-stack';
import { ComputeStack } from '../lib/compute-stack';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();

// Environment configuration for multi-environment deployment
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '000000000001',
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// Stack configuration for shared multi-environment resources
const stackConfig = {
  projectName: 'SoundBite',
  environment: 'multienv',
  enableMultiEnvironment: true, // Enable multi-environment support
  ...env,
};

console.log(
  `Deploying ${stackConfig.projectName} Multi-Environment Shared Resources`,
);
console.log(
  `This will create shared resources for staging and production environments`,
);

// Shared Database Stack (single DynamoDB table with environment prefixes)
const databaseStack = new DatabaseStack(
  app,
  `${stackConfig.projectName}-Shared-Database`,
  {
    ...stackConfig,
    enableMultiEnvironment: true,
    description: `SoundBite Shared Database Stack (DynamoDB) - Multi-Environment`,
  },
);

// Shared Storage Stack (single S3 bucket with environment folders)
const storageStack = new StorageStack(
  app,
  `${stackConfig.projectName}-Shared-Storage`,
  {
    ...stackConfig,
    enableMultiEnvironment: true,
    description: `SoundBite Shared Storage Stack (S3) - Multi-Environment`,
  },
);

// Shared Queue Stack (single SQS queue with environment attributes)
const queueStack = new QueueStack(
  app,
  `${stackConfig.projectName}-Shared-Queue`,
  {
    ...stackConfig,
    enableMultiEnvironment: true,
    description: `SoundBite Shared Queue Stack (SQS) - Multi-Environment`,
  },
);

// Shared Compute Stack (single Lambda function + ECR repository)
const computeStack = new ComputeStack(
  app,
  `${stackConfig.projectName}-Shared-Compute`,
  {
    ...stackConfig,
    description: `SoundBite Shared Compute Stack (Lambda + ECR) - Multi-Environment`,
    databaseTable: databaseStack.table,
    storageBucket: storageStack.bucket,
    messageQueue: queueStack.queue,
  },
);

// Shared API Stack (single EC2 instance running staging + production containers)
const apiStack = new ApiStack(app, `${stackConfig.projectName}-Shared-API`, {
  ...stackConfig,
  enableMultiEnvironment: true,
  description: `SoundBite Shared API Stack (EC2) - Multi-Environment`,
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
  Environment: 'multienv',
  EnvironmentType: 'shared',
  ManagedBy: 'CDK',
  MultiEnvironment: 'true',
};

[databaseStack, storageStack, queueStack, computeStack, apiStack].forEach(
  (stack) => {
    cdk.Tags.of(stack).add('Project', tags.Project);
    cdk.Tags.of(stack).add('Environment', tags.Environment);
    cdk.Tags.of(stack).add('EnvironmentType', tags.EnvironmentType);
    cdk.Tags.of(stack).add('ManagedBy', tags.ManagedBy);
    cdk.Tags.of(stack).add('MultiEnvironment', tags.MultiEnvironment);
  },
);

app.synth();
