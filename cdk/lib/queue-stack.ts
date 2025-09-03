import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { getEnvironmentConfig } from '../config';

export interface QueueStackProps extends cdk.StackProps {
  projectName: string;
  environment: string;
  enableMultiEnvironment?: boolean;
}

export class QueueStack extends cdk.Stack {
  public readonly queue: sqs.Queue;
  public readonly dlq: sqs.Queue;
  public readonly alertTopic: sns.Topic;
  public readonly dlqRedriveFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: QueueStackProps) {
    super(scope, id, props);

    const _config = getEnvironmentConfig(props.environment);

    // SNS Topic for alerts
    this.alertTopic = new sns.Topic(this, 'QueueAlertTopic', {
      topicName:
        props.enableMultiEnvironment === true
          ? `${props.projectName}-MultiEnv-QueueAlerts`
          : `${props.projectName}-${props.environment}-QueueAlerts`,
      displayName: 'SoundBite Queue Alerts',
    });

    // Dead Letter Queue with enhanced configuration
    this.dlq = new sqs.Queue(this, 'SoundbiteDLQ', {
      queueName:
        props.enableMultiEnvironment === true
          ? `${props.projectName}-MultiEnv-SoundbiteDLQ`
          : `${props.projectName}-${props.environment}-SoundbiteDLQ`,
      retentionPeriod: cdk.Duration.days(14),
      visibilityTimeout: cdk.Duration.seconds(130),
      // Enable redrive policy for DLQ
      redriveAllowPolicy: {
        redrivePermission: sqs.RedrivePermission.ALLOW_ALL,
      },
    });

    // Main Queue with Dead Letter Queue
    // For multi-environment: use single queue with environment message attributes
    this.queue = new sqs.Queue(this, 'SoundbiteQueue', {
      queueName:
        props.enableMultiEnvironment === true
          ? `${props.projectName}-MultiEnv-SoundbiteQueue`
          : `${props.projectName}-${props.environment}-SoundbiteQueue`,
      visibilityTimeout: cdk.Duration.seconds(130),
      deadLetterQueue: {
        queue: this.dlq,
        maxReceiveCount: 3,
      },
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Long polling
    });

    // DLQ Auto-Redrive Lambda Function
    this.dlqRedriveFunction = new lambda.Function(this, 'DLQRedriveFunction', {
      functionName:
        props.enableMultiEnvironment === true
          ? `${props.projectName}-MultiEnv-DLQRedrive`
          : `${props.projectName}-${props.environment}-DLQRedrive`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      environment: {
        SOURCE_QUEUE_URL: this.dlq.queueUrl,
        TARGET_QUEUE_URL: this.queue.queueUrl,
        MAX_MESSAGES_PER_BATCH: '10',
        ENVIRONMENT: props.environment,
      },
      code: lambda.Code.fromInline(`
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, SendMessageCommand } = require('@aws-sdk/client-sqs');

const sqs = new SQSClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  console.warn('DLQ Redrive function triggered:', JSON.stringify(event, null, 2));
  
  const sourceQueueUrl = process.env.SOURCE_QUEUE_URL;
  const targetQueueUrl = process.env.TARGET_QUEUE_URL;
  const maxMessages = parseInt(process.env.MAX_MESSAGES_PER_BATCH || '10');
  
  let processedCount = 0;
  let errorCount = 0;
  
  try {
    // Receive messages from DLQ
    const receiveParams = {
      QueueUrl: sourceQueueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 5,
      MessageAttributeNames: ['All'],
      AttributeNames: ['All']
    };
    
    const receiveResult = await sqs.send(new ReceiveMessageCommand(receiveParams));
    
    if (!receiveResult.Messages || receiveResult.Messages.length === 0) {
      console.warn('No messages found in DLQ');
      return { statusCode: 200, processedCount: 0, errorCount: 0 };
    }
    
    console.warn(\`Found \${receiveResult.Messages.length} messages in DLQ\`);
    
    // Process each message
    for (const message of receiveResult.Messages) {
      try {
        // Add retry metadata
        const messageAttributes = {
          ...message.MessageAttributes,
          'RetryCount': {
            StringValue: String(parseInt(message.MessageAttributes?.RetryCount?.StringValue || '0') + 1),
            DataType: 'Number'
          },
          'OriginalTimestamp': {
            StringValue: message.MessageAttributes?.OriginalTimestamp?.StringValue || new Date().toISOString(),
            DataType: 'String'
          },
          'RedriveTimestamp': {
            StringValue: new Date().toISOString(),
            DataType: 'String'
          }
        };
        
        // Send message back to main queue
        const sendParams = {
          QueueUrl: targetQueueUrl,
          MessageBody: message.Body,
          MessageAttributes: messageAttributes,
          DelaySeconds: 30 // Add delay to prevent immediate reprocessing
        };
        
        await sqs.send(new SendMessageCommand(sendParams));
        
        // Delete message from DLQ
        const deleteParams = {
          QueueUrl: sourceQueueUrl,
          ReceiptHandle: message.ReceiptHandle
        };
        
        await sqs.send(new DeleteMessageCommand(deleteParams));
        
        processedCount++;
        console.warn(\`Successfully redrove message \${message.MessageId}\`);
        
      } catch (error) {
        console.error(\`Error processing message \${message.MessageId}:\`, error);
        errorCount++;
      }
    }
    
    console.warn(\`DLQ Redrive completed. Processed: \${processedCount}, Errors: \${errorCount}\`);
    
    return {
      statusCode: 200,
      processedCount,
      errorCount,
      totalMessages: receiveResult.Messages.length
    };
    
  } catch (error) {
    console.error('DLQ Redrive function error:', error);
    throw error;
  }
};
      `),
    });

    // Grant permissions to the Lambda function
    this.queue.grantSendMessages(this.dlqRedriveFunction);
    this.dlq.grantConsumeMessages(this.dlqRedriveFunction);

    // Enhanced CloudWatch Alarms with SNS notifications
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
      alarmDescription:
        'SQS queue has more than 100 visible messages - potential processing bottleneck',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const dlqDepthAlarm = new cloudwatch.Alarm(this, 'DLQDepthAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SQS',
        metricName: 'ApproximateNumberOfVisibleMessages',
        dimensionsMap: {
          QueueName: this.dlq.queueName,
        },
        statistic: 'Maximum',
        period: cdk.Duration.minutes(1),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'SQS DLQ has messages - processing failures detected',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const ageOfOldestMessageAlarm = new cloudwatch.Alarm(
      this,
      'AgeOfOldestMessageAlarm',
      {
        metric: this.queue.metricApproximateAgeOfOldestMessage(),
        threshold: 300, // 5 minutes
        evaluationPeriods: 2,
        alarmDescription:
          'SQS messages older than 5 minutes - processing delays detected',
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      },
    );

    // Critical DLQ alarm for immediate attention
    const dlqCriticalAlarm = new cloudwatch.Alarm(this, 'DLQCriticalAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/SQS',
        metricName: 'ApproximateNumberOfVisibleMessages',
        dimensionsMap: {
          QueueName: this.dlq.queueName,
        },
        statistic: 'Maximum',
        period: cdk.Duration.minutes(1),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      alarmDescription:
        'CRITICAL: DLQ has 10+ messages - immediate attention required',
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Add SNS actions to alarms
    queueDepthAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic),
    );
    dlqDepthAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic),
    );
    ageOfOldestMessageAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic),
    );
    dlqCriticalAlarm.addAlarmAction(
      new cloudwatchActions.SnsAction(this.alertTopic),
    );

    // EventBridge rule for automatic DLQ redrive
    const dlqRedriveRule = new events.Rule(this, 'DLQRedriveRule', {
      ruleName:
        props.enableMultiEnvironment === true
          ? `${props.projectName}-MultiEnv-DLQRedrive`
          : `${props.projectName}-${props.environment}-DLQRedrive`,
      description:
        'Automatically trigger DLQ redrive when messages are detected',
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)), // Check every 15 minutes
      enabled: props.environment !== 'production', // Disable auto-redrive in production for safety
    });

    // Add Lambda target to the rule
    dlqRedriveRule.addTarget(
      new targets.LambdaFunction(this.dlqRedriveFunction, {
        event: events.RuleTargetInput.fromObject({
          source: 'eventbridge.scheduled',
          trigger: 'auto-redrive',
          environment: props.environment,
        }),
      }),
    );

    // Manual redrive capability via CloudWatch alarm
    const manualRedriveAlarm = new cloudwatch.Alarm(
      this,
      'ManualRedriveAlarm',
      {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/SQS',
          metricName: 'ApproximateNumberOfVisibleMessages',
          dimensionsMap: {
            QueueName: this.dlq.queueName,
          },
          statistic: 'Maximum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 1,
        alarmDescription: 'DLQ has 5+ messages - consider manual redrive',
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      },
    );

    // Add Lambda action for manual redrive (production environments)
    if (props.environment === 'production') {
      manualRedriveAlarm.addAlarmAction(
        new cloudwatchActions.SnsAction(this.alertTopic),
      );
    }

    // Outputs
    new cdk.CfnOutput(this, 'QueueUrl', {
      value: this.queue.queueUrl,
      description: 'SQS Queue URL',
      exportName:
        props.enableMultiEnvironment === true
          ? `${props.projectName}-MultiEnv-QueueUrl`
          : `${props.projectName}-${props.environment}-QueueUrl`,
    });

    new cdk.CfnOutput(this, 'QueueArn', {
      value: this.queue.queueArn,
      description: 'SQS Queue ARN',
      exportName:
        props.enableMultiEnvironment === true
          ? `${props.projectName}-MultiEnv-QueueArn`
          : `${props.projectName}-${props.environment}-QueueArn`,
    });

    new cdk.CfnOutput(this, 'DLQUrl', {
      value: this.dlq.queueUrl,
      description: 'SQS Dead Letter Queue URL',
      exportName:
        props.enableMultiEnvironment === true
          ? `${props.projectName}-MultiEnv-DLQUrl`
          : `${props.projectName}-${props.environment}-DLQUrl`,
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'SNS Topic ARN for Queue Alerts',
      exportName:
        props.enableMultiEnvironment === true
          ? `${props.projectName}-MultiEnv-AlertTopicArn`
          : `${props.projectName}-${props.environment}-AlertTopicArn`,
    });

    new cdk.CfnOutput(this, 'DLQRedriveFunctionArn', {
      value: this.dlqRedriveFunction.functionArn,
      description: 'DLQ Redrive Lambda Function ARN',
      exportName:
        props.enableMultiEnvironment === true
          ? `${props.projectName}-MultiEnv-DLQRedriveFunctionArn`
          : `${props.projectName}-${props.environment}-DLQRedriveFunctionArn`,
    });

    // Add stack tags
    cdk.Tags.of(this).add('Service', 'Queue');
    cdk.Tags.of(this).add('Component', 'SQS');
    if (props.enableMultiEnvironment === true) {
      cdk.Tags.of(this).add('MultiEnvironment', 'true');
    }
  }
}
