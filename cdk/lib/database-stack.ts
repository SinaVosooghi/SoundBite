import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { EnvironmentConfig, getEnvironmentConfig, getAllEnvironments } from '../config';

export interface DatabaseStackProps extends cdk.StackProps {
  projectName: string;
  environment: string;
  enableMultiEnvironment?: boolean;
}

export class DatabaseStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // DynamoDB Table with TTL for automatic cleanup
    // For multi-environment: use environment prefixes in partition key
    this.table = new dynamodb.Table(this, 'SoundbitesTable', {
      tableName: props.enableMultiEnvironment 
        ? `${props.projectName}-MultiEnv-SoundbitesTable`
        : `${props.projectName}-${props.environment}-SoundbitesTable`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING }, // env#id for multi-env
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },      // timestamp for multi-env
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Keep Free Tier friendly
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo - use RETAIN in production
      timeToLiveAttribute: 'ttl', // Enable TTL for automatic cleanup
      pointInTimeRecovery: true, // Enable point-in-time recovery
    });

    // Add GSI for environment-based queries (multi-environment)
    if (props.enableMultiEnvironment) {
      this.table.addGlobalSecondaryIndex({
        indexName: 'EnvironmentIndex',
        partitionKey: { name: 'environment', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
        projectionType: dynamodb.ProjectionType.ALL,
      });
    }

    // Add GSI for user queries (both single and multi-environment)
    this.table.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: props.enableMultiEnvironment 
        ? { name: 'environment', type: dynamodb.AttributeType.STRING }
        : { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // CloudWatch Alarms for monitoring (keep same for Free Tier)
    const readThrottleAlarm = new cloudwatch.Alarm(this, 'ReadThrottleAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ReadThrottleEvents',
        dimensionsMap: {
          TableName: this.table.tableName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'DynamoDB read throttle events',
    });

    const writeThrottleAlarm = new cloudwatch.Alarm(this, 'WriteThrottleAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'WriteThrottleEvents',
        dimensionsMap: {
          TableName: this.table.tableName,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'DynamoDB write throttle events',
    });

    const consumedReadCapacityAlarm = new cloudwatch.Alarm(this, 'ConsumedReadCapacityAlarm', {
      metric: this.table.metricConsumedReadCapacityUnits(),
      threshold: 1000,
      evaluationPeriods: 2,
      alarmDescription: 'High DynamoDB read capacity consumption',
    });

    const consumedWriteCapacityAlarm = new cloudwatch.Alarm(this, 'ConsumedWriteCapacityAlarm', {
      metric: this.table.metricConsumedWriteCapacityUnits(),
      threshold: 1000,
      evaluationPeriods: 2,
      alarmDescription: 'High DynamoDB write capacity consumption',
    });

    // Outputs
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB Table Name',
      exportName: props.enableMultiEnvironment
        ? `${props.projectName}-MultiEnv-TableName`
        : `${props.projectName}-${props.environment}-TableName`,
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB Table ARN',
      exportName: props.enableMultiEnvironment
        ? `${props.projectName}-MultiEnv-TableArn`
        : `${props.projectName}-${props.environment}-TableArn`,
    });

    // Add stack tags
    cdk.Tags.of(this).add('Service', 'Database');
    cdk.Tags.of(this).add('Component', 'DynamoDB');
    if (props.enableMultiEnvironment) {
      cdk.Tags.of(this).add('MultiEnvironment', 'true');
    }
  }
} 