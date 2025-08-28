export const stagingConfig = {
  name: 'staging',
  port: 3000,
  aws: {
    region: 'us-east-1',
    credentials: {
      // Uses EC2 instance role
    },
  },
  services: {
    dynamodb: {
      tableName: 'SoundBite-MultiEnv-SoundbitesTable',
      endpoint: undefined,
    },
    s3: {
      bucketName: 'soundbite-multienv-soundbites-762233763891',
      endpoint: undefined,
    },
    sqs: {
      queueUrl:
        'https://sqs.us-east-1.amazonaws.com/762233763891/SoundBite-MultiEnv-SoundbiteQueue',
      endpoint: undefined,
    },
  },
};
