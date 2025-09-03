export interface EnvironmentConfig {
  name: string;
  port: number;
  prefix: string;
  domain: string;
  logLevel: string;
  enableMetrics: boolean;
  enableBackup: boolean;
  retentionDays: number;
  features: string[];
  description: string;
}

export const environments: Record<string, EnvironmentConfig> = {
  development: {
    name: 'development',
    port: 3001,
    prefix: 'dev',
    domain: 'dev.soundbite.local',
    logLevel: 'debug',
    enableMetrics: false,
    enableBackup: false,
    retentionDays: 7,
    features: ['basic', 'debug', 'local'],
    description: 'Development environment for local testing and debugging',
  },
  staging: {
    name: 'staging',
    port: 3002,
    prefix: 'staging',
    domain: 'staging.soundbite.local',
    logLevel: 'info',
    enableMetrics: true,
    enableBackup: false,
    retentionDays: 30,
    features: ['basic', 'monitoring', 'testing'],
    description: 'Staging environment for testing and validation',
  },
  production: {
    name: 'production',
    port: 3003,
    prefix: 'prod',
    domain: 'api.soundbite.local',
    logLevel: 'warn',
    enableMetrics: true,
    enableBackup: true,
    retentionDays: 90,
    features: ['full', 'monitoring', 'backup', 'scaling'],
    description: 'Production environment for live users',
  },
};

export const getEnvironmentConfig = (env: string): EnvironmentConfig => {
  const config = environments[env];
  if (config === undefined) {
    throw new Error(
      `Unknown environment: ${env}. Valid environments: ${Object.keys(environments).join(', ')}`,
    );
  }
  return config;
};

export const getAllEnvironments = (): string[] => Object.keys(environments);

export const getEnvironmentByPort = (
  port: number,
): EnvironmentConfig | null => {
  return Object.values(environments).find((env) => env.port === port) ?? null;
};

export const getEnvironmentByPrefix = (
  prefix: string,
): EnvironmentConfig | null => {
  return (
    Object.values(environments).find((env) => env.prefix === prefix) ?? null
  );
};
