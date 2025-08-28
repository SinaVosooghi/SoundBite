export const developmentLocalStackConfig = {
  name: 'development-localstack',
  port: 3000,
  aws: {
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  },
  services: {
    dynamodb: {
      tableName: 'SoundBite-MultiEnv-SoundbitesTable',
      endpoint: 'http://localhost:4566',
    },
    s3: {
      bucketName: 'soundbite-multienv-soundbites-762233763891',
      endpoint: 'http://localhost:4566',
    },
    sqs: {
      queueUrl:
        'http://localhost:4566/000000000000/SoundBite-MultiEnv-SoundbiteQueue',
      endpoint: 'http://localhost:4566',
    },
  },
};
