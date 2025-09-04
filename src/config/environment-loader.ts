import { developmentLocalStackConfig } from './environments/development-localstack.config';
import { developmentAWSConfig } from './environments/development-aws.config';
import { stagingConfig } from './environments/staging.config';
import { productionConfig } from './environments/production.config';

export interface EnvironmentConfig {
  name: string;
  port: number;
  aws: {
    endpoint?: string;
    region: string;
    credentials?: {
      accessKeyId?: string;
      secretAccessKey?: string;
    };
  };
  services: {
    dynamodb: {
      tableName: string;
      endpoint?: string;
    };
    s3: {
      bucketName: string;
      endpoint?: string;
    };
    sqs: {
      queueUrl: string;
      endpoint?: string;
    };
  };
}

export class EnvironmentLoader {
  private static instance: EnvironmentLoader;
  private currentConfig: EnvironmentConfig;

  private constructor() {
    this.currentConfig = this.detectEnvironment();
  }

  public static getInstance(): EnvironmentLoader {
    EnvironmentLoader.instance ??= new EnvironmentLoader();
    return EnvironmentLoader.instance;
  }

  public getConfig(): EnvironmentConfig {
    return this.currentConfig;
  }

  public getEnvironmentName(): string {
    return this.currentConfig.name;
  }

  public isDevelopment(): boolean {
    return this.currentConfig.name.startsWith('development');
  }

  public isStaging(): boolean {
    return this.currentConfig.name === 'staging';
  }

  public isProduction(): boolean {
    return this.currentConfig.name === 'production';
  }

  public isLocalStack(): boolean {
    return this.currentConfig.name === 'development-localstack';
  }

  public isRealAWS(): boolean {
    return (
      this.currentConfig.name === 'development-aws' ||
      this.currentConfig.name === 'staging' ||
      this.currentConfig.name === 'production'
    );
  }

  private detectEnvironment(): EnvironmentConfig {
    const nodeEnv = process.env.NODE_ENV ?? 'development';
    const awsConnectionMode = process.env.AWS_CONNECTION_MODE ?? 'localstack';

    // Check if running in Docker test environment
    if (nodeEnv === 'test') {
      return {
        name: 'test',
        port: 3000,
        aws: {
          region: 'us-east-1',
          credentials: {
            accessKeyId: 'test',
            secretAccessKey: 'test',
          },
        },
        services: {
          dynamodb: {
            tableName: 'test-table',
          },
          s3: {
            bucketName: 'test-bucket',
          },
          sqs: {
            queueUrl: 'http://localhost:4566/test-queue',
          },
        },
      };
    }

    // Check if running in Docker (EC2)
    if (
      process.env.ENVIRONMENT !== undefined &&
      process.env.ENVIRONMENT !== null &&
      process.env.ENVIRONMENT.length > 0
    ) {
      switch (process.env.ENVIRONMENT) {
        case 'staging':
          return stagingConfig;
        case 'production':
          return productionConfig;
        default:
          return stagingConfig; // fallback
      }
    }

    // Check if running locally
    if (nodeEnv === 'development') {
      if (awsConnectionMode === 'aws') {
        return developmentAWSConfig;
      } else {
        return developmentLocalStackConfig;
      }
    }

    // Default fallback
    return developmentLocalStackConfig;
  }
}

// Export singleton instance
export const environmentLoader = EnvironmentLoader.getInstance();
export const getEnvironmentConfig = (): EnvironmentConfig =>
  environmentLoader.getConfig();
export const getEnvironmentName = (): string =>
  environmentLoader.getEnvironmentName();
export const isDevelopment = (): boolean => environmentLoader.isDevelopment();
export const isStaging = (): boolean => environmentLoader.isStaging();
export const isProduction = (): boolean => environmentLoader.isProduction();
export const isLocalStack = (): boolean => environmentLoader.isLocalStack();
export const isRealAWS = (): boolean => environmentLoader.isRealAWS();
