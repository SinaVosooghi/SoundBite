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
      tableName: 'SoundBite-staging-SoundbitesTable',
      endpoint: undefined,
    },
    s3: {
      bucketName: 'soundbite-staging-soundbites-762233763891',
      endpoint: undefined,
    },
    sqs: {
      queueUrl:
        'https://sqs.us-east-1.amazonaws.com/762233763891/SoundBite-staging-SoundbiteQueue',
      endpoint: undefined,
    },
  },
};
