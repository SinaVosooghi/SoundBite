import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';

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

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // ECR Repository for Docker images
    this.ecrRepository = new ecr.Repository(this, 'SoundbiteApiRepo', {
      repositoryName: `${props.projectName.toLowerCase()}-${props.environment}-api`,
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo - use RETAIN in production
    });

    // Lambda IAM Role with least privilege
    const lambdaRole = new iam.Role(this, 'SoundbiteProcessorRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant specific permissions
    props.messageQueue.grantConsumeMessages(lambdaRole);
    props.storageBucket.grantWrite(lambdaRole);
    props.databaseTable.grantWriteData(lambdaRole);

    // Polly permissions
    lambdaRole.addToPolicy(
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
      role: lambdaRole,
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

    // CloudWatch Alarms for Lambda monitoring
    const lambdaErrorsAlarm = new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      metric: this.lambdaFunction.metricErrors(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Lambda function errors',
    });

    const lambdaDurationAlarm = new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
      metric: this.lambdaFunction.metricDuration(),
      threshold: 250000, // 250 seconds
      evaluationPeriods: 2,
      alarmDescription: 'Lambda function duration exceeded 250 seconds',
    });

    const lambdaThrottlesAlarm = new cloudwatch.Alarm(this, 'LambdaThrottlesAlarm', {
      metric: this.lambdaFunction.metricThrottles(),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: 'Lambda function throttles',
    });

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