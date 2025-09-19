import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import type * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import type * as s3 from 'aws-cdk-lib/aws-s3';
import type * as sqs from 'aws-cdk-lib/aws-sqs';
import type * as ecr from 'aws-cdk-lib/aws-ecr';

export interface ApiStackProps extends cdk.StackProps {
  projectName: string;
  environment: string;
  databaseTable: dynamodb.Table;
  storageBucket: s3.Bucket;
  messageQueue: sqs.Queue;
  ecrRepository: ecr.Repository;
  enableMultiEnvironment?: boolean;
}

export class ApiStack extends cdk.Stack {
  public readonly apiInstance: ec2.Instance;
  private cpuUtilizationAlarm: cloudwatch.Alarm;
  private memoryUtilizationAlarm: cloudwatch.Alarm;
  private networkInAlarm: cloudwatch.Alarm;

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

    // Security Group for EC2 - Updated for multi-environment ports
    const apiSg = new ec2.SecurityGroup(this, 'ApiSecurityGroup', {
      vpc,
      description: 'Allow HTTP, SSH and multi-environment app traffic',
      allowAllOutbound: true,
    });
    apiSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH');
    apiSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP (Nginx)',
    );

    // Multi-environment ports
    if (props.enableMultiEnvironment ?? false) {
      apiSg.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(3001),
        'Allow Development Environment',
      );
      apiSg.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(3002),
        'Allow Staging Environment',
      );
      apiSg.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(3003),
        'Allow Production Environment',
      );
    } else {
      apiSg.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(3000),
        'Allow Single Environment',
      );
    }

    // IAM Role for EC2 (allow ECR, SQS send, S3 read, DynamoDB read, CloudWatch logs, SSM)
    const ec2Role = new iam.Role(this, 'ApiEc2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonEC2ContainerRegistryReadOnly',
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonDynamoDBReadOnlyAccess',
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'CloudWatchAgentServerPolicy',
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'AmazonSSMManagedInstanceCore',
        ),
      ],
    });

    // Grant specific permissions
    props.databaseTable.grantReadWriteData(ec2Role);
    props.storageBucket.grantReadWrite(ec2Role);
    props.messageQueue.grantSendMessages(ec2Role);

    // User data script for EC2 with Docker and multi-environment setup
    const userData = ec2.UserData.forLinux();

    if (props.enableMultiEnvironment ?? false) {
      // Simplified setup - Focus on staging deployment
      userData.addCommands(
        '#!/bin/bash -xe',
        'exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1',
        'echo "=== Starting SoundBite EC2 User Data Script ==="',
        'dnf update -y',
        'dnf install -y docker nginx git',
        'systemctl start docker',
        'systemctl enable docker',
        'systemctl start nginx',
        'systemctl enable nginx',
        'usermod -a -G docker ec2-user',
        'echo "=== Basic packages installed successfully ==="',
        // Install Docker Compose
        'curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose',
        'chmod +x /usr/local/bin/docker-compose',
        // Login to ECR
        `aws ecr get-login-password --region ${this.region} | docker login --username AWS --password-stdin ${props.ecrRepository.repositoryUri.split('/')[0]}`,
        // Clone the repository for multi-environment setup
        'cd /home/ec2-user',
        'git clone https://github.com/SinaVosooghi/SoundBite.git || echo "Repository already exists"',
        'cd SoundBite',
        'echo "=== Repository cloned, starting Docker setup ==="',
        // Stop any existing containers
        'docker stop soundbite-dev-localstack soundbite-dev-aws soundbite-dev-aws-deployed soundbite-staging soundbite-production nginx localstack || true',
        'docker rm soundbite-dev-localstack soundbite-dev-aws soundbite-dev-aws-deployed soundbite-staging soundbite-production nginx localstack || true',
        // Pull only available staging image from ECR
        `docker pull ${props.ecrRepository.repositoryUri}:staging || echo "staging image not found"`,
        // Tag staging image for both staging and production (temporary solution)
        `docker tag ${props.ecrRepository.repositoryUri}:staging soundbite:staging || echo "staging tag failed"`,
        `docker tag ${props.ecrRepository.repositoryUri}:staging soundbite:production || echo "production tag failed"`,
        'echo "=== Ready to start Docker containers ==="',
        // Create nginx configuration directory
        'mkdir -p nginx',
        // Create nginx configuration file
        'cat > nginx/soundbite.conf << "NGINX_EOF"',
        'server {',
        '    listen 80;',
        '    server_name _;',
        '',
        '    # Health check endpoint',
        '    location /health {',
        '        return 200 "Multi-environment setup is running!\\n";',
        '        add_header Content-Type text/plain;',
        '    }',
        '',
        '    # Staging Environment',
        '    location /staging/ {',
        '        proxy_pass http://localhost:3000/;',
        '        proxy_set_header Host $host;',
        '        proxy_set_header X-Real-IP $remote_addr;',
        '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
        '        proxy_set_header X-Forwarded-Proto $scheme;',
        '        proxy_connect_timeout 5s;',
        '        proxy_send_timeout 5s;',
        '        proxy_read_timeout 5s;',
        '    }',
        '',
        '    # Production Environment',
        '    location /prod/ {',
        '        proxy_pass http://localhost:3001/;',
        '        proxy_set_header Host $host;',
        '        proxy_set_header X-Real-IP $remote_addr;',
        '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
        '        proxy_set_header X-Forwarded-Proto $scheme;',
        '        proxy_connect_timeout 5s;',
        '        proxy_send_timeout 5s;',
        '        proxy_read_timeout 5s;',
        '    }',
        '',
        '    # Default route - show environment list',
        '    location / {',
        '        return 200 "SoundBite Deployment\\n\\nAvailable environments:\\n- /staging/ - Staging Environment\\n- /prod/ - Production Environment\\n- /health - Health Check\\n";',
        '        add_header Content-Type text/plain;',
        '    }',
        '}',
        'NGINX_EOF',
        '',
        // Copy nginx configuration and restart nginx
        'cp nginx/soundbite.conf /etc/nginx/conf.d/soundbite.conf',
        'nginx -t',
        'systemctl restart nginx',
        'systemctl status nginx',
        'echo "=== Nginx configured and restarted ==="',
        '',
        // Create simplified docker-compose.yml file
        'cat > docker-compose.yml << "EOF"',
        '# Simplified Docker Compose for SoundBite',
        'version: "3.8"',
        '',
        'services:',
        '  # Staging Environment',
        '  soundbite-staging:',
        '    image: soundbite:staging',
        '    container_name: soundbite-staging',
        '    environment:',
        '      - NODE_ENV=staging',
        '      - ENVIRONMENT=staging',
        '      - PORT=3000',
        '    ports:',
        '      - "3000:3000"',
        '    networks:',
        '      - soundbite-network',
        '    restart: unless-stopped',
        '',
        '  # Production Environment',
        '  soundbite-production:',
        '    image: soundbite:production',
        '    container_name: soundbite-production',
        '    environment:',
        '      - NODE_ENV=production',
        '      - ENVIRONMENT=production',
        '      - PORT=3000',
        '    ports:',
        '      - "3001:3000"',
        '    networks:',
        '      - soundbite-network',
        '    restart: unless-stopped',
        '',
        '  # Nginx Reverse Proxy',
        '  nginx:',
        '    image: nginx:alpine',
        '    container_name: soundbite-nginx',
        '    ports:',
        '      - "80:80"',
        '    networks:',
        '      - soundbite-network',
        '    depends_on:',
        '      - soundbite-staging',
        '      - soundbite-production',
        '    restart: unless-stopped',
        '',
        'networks:',
        '  soundbite-network:',
        '    driver: bridge',
        '',
        'EOF',
        '',
        // Start staging and production using docker-compose
        'docker-compose up -d',
        'echo "=== Docker containers started ==="',
        // Wait for containers to start
        'sleep 30',
        // Check container status
        'docker ps | grep soundbite || echo "Some containers not running"',
        'echo "=== SoundBite Deployment Complete ==="',
        // Get public IP for external access
        'PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)',
        'echo "External access:"',
        'echo "  staging: http://$PUBLIC_IP/staging/"',
        'echo "  production: http://$PUBLIC_IP/prod/"',
        'echo "  health: http://$PUBLIC_IP/health"',
      );
    } else {
      // Single environment setup (original)
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
    }

    // EC2 Instance - Cost optimized for development/testing
    this.apiInstance = new ec2.Instance(
      this,
      `ApiInstance-${props.environment}`,
      {
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
        // Force replacement by adding unique identifier
        userDataCausesReplacement: true,
      },
    );

    // Create CloudWatch alarms for monitoring
    this.cpuUtilizationAlarm = new cloudwatch.Alarm(
      this,
      'CpuUtilizationAlarm',
      {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/EC2',
          metricName: 'CPUUtilization',
          dimensionsMap: { InstanceId: this.apiInstance.instanceId },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 80,
        evaluationPeriods: 2,
        alarmDescription: 'CPU utilization exceeded threshold',
      },
    );

    this.memoryUtilizationAlarm = new cloudwatch.Alarm(
      this,
      'MemoryUtilizationAlarm',
      {
        metric: new cloudwatch.Metric({
          namespace: 'AWS/EC2',
          metricName: 'MemoryUtilization',
          dimensionsMap: { InstanceId: this.apiInstance.instanceId },
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 80,
        evaluationPeriods: 2,
        alarmDescription: 'Memory utilization exceeded threshold',
      },
    );

    this.networkInAlarm = new cloudwatch.Alarm(this, 'NetworkInAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/EC2',
        metricName: 'NetworkIn',
        dimensionsMap: { InstanceId: this.apiInstance.instanceId },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1000000, // 1 MB
      evaluationPeriods: 2,
      alarmDescription: 'Network input exceeded threshold',
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

    // Add multi-environment specific outputs
    if (props.enableMultiEnvironment ?? false) {
      new cdk.CfnOutput(this, 'MultiEnvironmentEndpoints', {
        value: `Development: /dev/, Staging: /staging/, Production: /prod/`,
        description: 'Multi-Environment API Endpoints',
        exportName: `${props.projectName}-${props.environment}-MultiEnvironmentEndpoints`,
      });
    }

    // Add stack tags
    cdk.Tags.of(this).add('Service', 'API');
    cdk.Tags.of(this).add('Component', 'EC2');
    if (props.enableMultiEnvironment ?? false) {
      cdk.Tags.of(this).add('MultiEnvironment', 'true');
    }
  }
}
