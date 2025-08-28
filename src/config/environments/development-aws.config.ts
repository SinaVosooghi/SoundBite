export const developmentAWSConfig = {
  name: 'development-aws',
  port: 3000,
  aws: {
    region: 'us-east-1',
    credentials: {
      // Uses AWS CLI credentials or environment variables
    },
  },
  services: {
    dynamodb: {
      tableName: 'SoundBite-MultiEnv-SoundbitesTable',
      endpoint: undefined, // Uses default AWS endpoint
    },
    s3: {
      bucketName: 'soundbite-multienv-soundbites-762233763891',
      endpoint: undefined, // Uses default AWS endpoint
    },
    sqs: {
      queueUrl:
        'https://sqs.us-east-1.amazonaws.com/762233763891/SoundBite-MultiEnv-SoundbiteQueue',
      endpoint: undefined, // Uses default AWS endpoint
    },
  },
};
