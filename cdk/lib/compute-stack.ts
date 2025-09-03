import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import type * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import type * as sqs from 'aws-cdk-lib/aws-sqs';
import type * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface ComputeStackProps extends cdk.StackProps {
  projectName: string;
  environment: string;
  databaseTable: dynamodb.Table;
  storageBucket: s3.Bucket;
  messageQueue: sqs.Queue;
}

export class ComputeStack extends cdk.Stack {
  public readonly ecrRepository: ecr.Repository;
  public readonly lambdaFunction: lambda.Function;
  public readonly lambdaRole: iam.Role;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  private lambdaErrorsAlarm: cloudwatch.Alarm;
  private lambdaDurationAlarm: cloudwatch.Alarm;
  private lambdaThrottlesAlarm: cloudwatch.Alarm;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // ECR Repository for Docker images
    this.ecrRepository = new ecr.Repository(this, 'SoundbiteApiRepo', {
      repositoryName: `${props.projectName.toLowerCase()}-${props.environment}-api`,
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo - use RETAIN in production
    });

    // Lambda IAM Role with least privilege
    this.lambdaRole = new iam.Role(this, 'SoundbiteProcessorRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    // Grant specific permissions
    props.messageQueue.grantConsumeMessages(this.lambdaRole);
    props.storageBucket.grantWrite(this.lambdaRole);
    props.databaseTable.grantWriteData(this.lambdaRole);

    // Polly permissions
    this.lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['polly:SynthesizeSpeech'],
        resources: ['*'],
      }),
    );

    // Lambda Function for processing soundbites
    this.lambdaFunction = new lambda.Function(this, 'SoundbiteProcessor', {
      functionName: `${props.projectName}-${props.environment}-processor`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../lambda/processor'),
      role: this.lambdaRole,
      timeout: cdk.Duration.seconds(120), // Must be less than SQS visibility timeout
      memorySize: 512,
      environment: {
        BUCKET_NAME: props.storageBucket.bucketName,
        TABLE_NAME: props.databaseTable.tableName,
        NODE_ENV: props.environment,
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Add SQS event source
    this.lambdaFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(props.messageQueue, {
        batchSize: 1,
        maxBatchingWindow: cdk.Duration.seconds(5),
      }),
    );

    // Create CloudWatch alarms for monitoring
    this.lambdaErrorsAlarm = new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        dimensionsMap: { FunctionName: this.lambdaFunction.functionName },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 2,
      alarmDescription: 'Lambda function errors exceeded threshold',
    });

    this.lambdaDurationAlarm = new cloudwatch.Alarm(
      this,
      'LambdaDurationAlarm',
      {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          dimensionsMap: { FunctionName: this.lambdaFunction.functionName },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 30000, // 30 seconds
        evaluationPeriods: 2,
        alarmDescription: 'Lambda function duration exceeded threshold',
      },
    );

    this.lambdaThrottlesAlarm = new cloudwatch.Alarm(
      this,
      'LambdaThrottlesAlarm',
      {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Throttles',
          dimensionsMap: { FunctionName: this.lambdaFunction.functionName },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 2,
        alarmDescription: 'Lambda function throttles exceeded threshold',
      },
    );

    // Outputs
    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: this.ecrRepository.repositoryUri,
      description: 'ECR Repository URI',
      exportName: `${props.projectName}-${props.environment}-EcrRepositoryUri`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: this.lambdaFunction.functionName,
      description: 'Lambda Function Name',
      exportName: `${props.projectName}-${props.environment}-LambdaFunctionName`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionArn', {
      value: this.lambdaFunction.functionArn,
      description: 'Lambda Function ARN',
      exportName: `${props.projectName}-${props.environment}-LambdaFunctionArn`,
    });

    // Add stack tags
    cdk.Tags.of(this).add('Service', 'Compute');
    cdk.Tags.of(this).add('Component', 'Lambda-ECR');
  }
}
