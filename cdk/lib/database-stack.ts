import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export interface DatabaseStackProps extends cdk.StackProps {
  projectName: string;
  environment: string;
}

export class DatabaseStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // DynamoDB Table with TTL for automatic cleanup
    this.table = new dynamodb.Table(this, 'SoundbitesTable', {
      tableName: `${props.projectName}-${props.environment}-SoundbitesTable`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo - use RETAIN in production
      timeToLiveAttribute: 'ttl', // Enable TTL for automatic cleanup
      pointInTimeRecovery: true, // Enable point-in-time recovery
    });

    // Add GSI for user queries
    this.table.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // CloudWatch Alarms for monitoring
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
      exportName: `${props.projectName}-${props.environment}-TableName`,
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB Table ARN',
      exportName: `${props.projectName}-${props.environment}-TableArn`,
    });

    // Add stack tags
    cdk.Tags.of(this).add('Service', 'Database');
    cdk.Tags.of(this).add('Component', 'DynamoDB');
  }
} 