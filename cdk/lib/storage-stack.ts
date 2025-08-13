import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

export interface StorageStackProps extends cdk.StackProps {
  projectName: string;
  environment: string;
}

export class StorageStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    // S3 Bucket with lifecycle rules for cost control
    this.bucket = new s3.Bucket(this, 'SoundbitesBucket', {
      bucketName: `${props.projectName.toLowerCase()}-${props.environment}-soundbites-bucket-${this.account}`,
      versioned: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo - use RETAIN in production
      lifecycleRules: [
        {
          id: 'DeleteOldSoundbites',
          enabled: true,
          expiration: cdk.Duration.days(90), // Delete files after 90 days
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30), // AWS requires >= 30 days
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(60), // AWS best practice: >= 60 days
            },
          ],
        },
      ],
    });

    // CloudWatch Alarms for monitoring
    const bucketSizeAlarm = new cloudwatch.Alarm(this, 'BucketSizeAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: 'BucketSizeBytes',
        dimensionsMap: {
          BucketName: this.bucket.bucketName,
          StorageType: 'StandardStorage',
        },
        statistic: 'Average',
        period: cdk.Duration.hours(1),
      }),
      threshold: 10 * 1024 * 1024 * 1024, // 10GB
      evaluationPeriods: 2,
      alarmDescription: 'S3 bucket size exceeded 10GB',
    });

    const numberOfObjectsAlarm = new cloudwatch.Alarm(this, 'NumberOfObjectsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/S3',
        metricName: 'NumberOfObjects',
        dimensionsMap: {
          BucketName: this.bucket.bucketName,
          StorageType: 'AllStorageTypes',
        },
        statistic: 'Average',
        period: cdk.Duration.hours(1),
      }),
      threshold: 10000,
      evaluationPeriods: 2,
      alarmDescription: 'S3 bucket has more than 10,000 objects',
    });

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'S3 Bucket Name',
      exportName: `${props.projectName}-${props.environment}-BucketName`,
    });

    new cdk.CfnOutput(this, 'BucketArn', {
      value: this.bucket.bucketArn,
      description: 'S3 Bucket ARN',
      exportName: `${props.projectName}-${props.environment}-BucketArn`,
    });

    // Add stack tags
    cdk.Tags.of(this).add('Service', 'Storage');
    cdk.Tags.of(this).add('Component', 'S3');
  }
} 