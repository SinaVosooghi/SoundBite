// Environment configurations
export * from './environments/development-localstack.config';
export * from './environments/development-aws.config';
export * from './environments/staging.config';
export * from './environments/production.config';

// Environment loader
export * from './environment-loader';

// Default exports
export { environmentLoader as default } from './environment-loader';
export { getEnvironmentConfig, getEnvironmentName, isDevelopment, isStaging, isProduction, isLocalStack, isRealAWS } from './environment-loader';
