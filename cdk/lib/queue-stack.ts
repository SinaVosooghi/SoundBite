import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export interface QueueStackProps extends cdk.StackProps {
  projectName: string;
  environment: string;
}

export class QueueStack extends cdk.Stack {
  public readonly queue: sqs.Queue;
  public readonly dlq: sqs.Queue;

  constructor(scope: Construct, id: string, props: QueueStackProps) {
    super(scope, id, props);

    // Dead Letter Queue
    this.dlq = new sqs.Queue(this, 'SoundbiteDLQ', {
      queueName: `${props.projectName}-${props.environment}-SoundbiteDLQ`,
      retentionPeriod: cdk.Duration.days(14),
      visibilityTimeout: cdk.Duration.seconds(130),
    });

    // Main Queue with Dead Letter Queue
    this.queue = new sqs.Queue(this, 'SoundbiteQueue', {
      queueName: `${props.projectName}-${props.environment}-SoundbiteQueue`,
      visibilityTimeout: cdk.Duration.seconds(130),
      deadLetterQueue: {
        queue: this.dlq,
        maxReceiveCount: 3,
      },
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Long polling
    });

    // CloudWatch Alarms for monitoring
    const queueDepthAlarm = new cloudwatch.Alarm(this, 'QueueDepthAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SQS',
        metricName: 'ApproximateNumberOfVisibleMessages',
        dimensionsMap: {
          QueueName: this.queue.queueName,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 100,
      evaluationPeriods: 2,
      alarmDescription: 'SQS queue has more than 100 visible messages',
    });

    const dlqDepthAlarm = new cloudwatch.Alarm(this, 'DLQDepthAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SQS',
        metricName: 'ApproximateNumberOfVisibleMessages',
        dimensionsMap: {
          QueueName: this.dlq.queueName,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'SQS DLQ has messages (processing failures)',
    });

    const ageOfOldestMessageAlarm = new cloudwatch.Alarm(this, 'AgeOfOldestMessageAlarm', {
      metric: this.queue.metricApproximateAgeOfOldestMessage(),
      threshold: 300, // 5 minutes
      evaluationPeriods: 2,
      alarmDescription: 'SQS messages older than 5 minutes',
    });

    // Outputs
    new cdk.CfnOutput(this, 'QueueUrl', {
      value: this.queue.queueUrl,
      description: 'SQS Queue URL',
      exportName: `${props.projectName}-${props.environment}-QueueUrl`,
    });

    new cdk.CfnOutput(this, 'QueueArn', {
      value: this.queue.queueArn,
      description: 'SQS Queue ARN',
      exportName: `${props.projectName}-${props.environment}-QueueArn`,
    });

    new cdk.CfnOutput(this, 'DLQUrl', {
      value: this.dlq.queueUrl,
      description: 'SQS Dead Letter Queue URL',
      exportName: `${props.projectName}-${props.environment}-DLQUrl`,
    });

    // Add stack tags
    cdk.Tags.of(this).add('Service', 'Queue');
    cdk.Tags.of(this).add('Component', 'SQS');
  }
} 