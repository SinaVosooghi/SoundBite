import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export interface ApiStackProps extends cdk.StackProps {
  projectName: string;
  environment: string;
  databaseTable: dynamodb.Table;
  storageBucket: s3.Bucket;
  messageQueue: sqs.Queue;
  ecrRepository: ecr.Repository;
}

export class ApiStack extends cdk.Stack {
  public readonly apiInstance: ec2.Instance;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // VPC: Use default if available, otherwise create a new one
    let vpc: ec2.IVpc;
    try {
      vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });
    } catch {
      vpc = new ec2.Vpc(this, 'SoundbiteVpc', {
        maxAzs: 2,
        natGateways: 0, // NO NAT Gateway - cost savings!
        subnetConfiguration: [
          {
            name: 'public',
            subnetType: ec2.SubnetType.PUBLIC,
          },
        ],
      });
    }

    // Security Group for EC2
    const apiSg = new ec2.SecurityGroup(this, 'ApiSecurityGroup', {
      vpc,
      description: 'Allow HTTP, SSH and app traffic',
      allowAllOutbound: true,
    });
    apiSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH');
    apiSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP');
    apiSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3000),
      'Allow NestJS',
    );

    // IAM Role for EC2 (allow ECR, SQS send, S3 read, DynamoDB read, CloudWatch logs, SSM)
    const ec2Role = new iam.Role(this, 'ApiEc2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Grant specific permissions
    props.databaseTable.grantReadWriteData(ec2Role);
    props.storageBucket.grantReadWrite(ec2Role);
    props.messageQueue.grantSendMessages(ec2Role);

    // User data script for EC2 with Docker
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'dnf update -y',
      'dnf install -y docker',
      'systemctl start docker',
      'systemctl enable docker',
      'usermod -a -G docker ec2-user',
      // Login to ECR
      `aws ecr get-login-password --region ${this.region} | docker login --username AWS --password-stdin ${props.ecrRepository.repositoryUri.split('/')[0]}`,
      // Stop any existing container
      'docker stop soundbite-api || true',
      'docker rm soundbite-api || true',
      // Pull and run the Docker image
      `docker pull ${props.ecrRepository.repositoryUri}:latest`,
      'docker run -d --name soundbite-api -p 3000:3000 \\',
      '  -e NODE_ENV=production \\',
      `  -e AWS_REGION=${this.region} \\`,
      `  -e SQS_QUEUE_URL=${props.messageQueue.queueUrl} \\`,
      `  -e DYNAMODB_TABLE=${props.databaseTable.tableName} \\`,
      `  -e S3_BUCKET=${props.storageBucket.bucketName} \\`,
      '  --restart unless-stopped \\',
      `  ${props.ecrRepository.repositoryUri}:latest`,
      // Wait a bit and check if container is running
      'sleep 10',
      'docker ps | grep soundbite-api || echo "Container not running"',
    );

    // EC2 Instance - Cost optimized for development/testing
    this.apiInstance = new ec2.Instance(this, 'ApiInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: apiSg,
      role: ec2Role,
      keyName: undefined, // Optionally set your SSH key name
      userData,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC }, // Ensure public subnet
      // Cost optimization: Stop instance when not in use
      requireImdsv2: true, // Security best practice
    });

    // CloudWatch Alarms for EC2 monitoring
    const cpuUtilizationAlarm = new cloudwatch.Alarm(this, 'CpuUtilizationAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          InstanceId: this.apiInstance.instanceId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'EC2 CPU utilization exceeded 80%',
    });

    const memoryUtilizationAlarm = new cloudwatch.Alarm(this, 'MemoryUtilizationAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'MemoryUtilization',
        dimensionsMap: {
          InstanceId: this.apiInstance.instanceId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'EC2 memory utilization exceeded 80%',
    });

    const networkInAlarm = new cloudwatch.Alarm(this, 'NetworkInAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'NetworkIn',
        dimensionsMap: {
          InstanceId: this.apiInstance.instanceId,
        },
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1000000, // 1MB
      evaluationPeriods: 2,
      alarmDescription: 'EC2 network in exceeded 1MB',
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiInstanceId', {
      value: this.apiInstance.instanceId,
      description: 'EC2 Instance ID',
      exportName: `${props.projectName}-${props.environment}-ApiInstanceId`,
    });

    new cdk.CfnOutput(this, 'ApiInstancePrivateIp', {
      value: this.apiInstance.instancePrivateIp,
      description: 'EC2 Private IP for API',
      exportName: `${props.projectName}-${props.environment}-ApiInstancePrivateIp`,
    });

    // Add stack tags
    cdk.Tags.of(this).add('Service', 'API');
    cdk.Tags.of(this).add('Component', 'EC2');
  }
} 