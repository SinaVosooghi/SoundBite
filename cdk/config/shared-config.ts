export interface SharedConfig {
  projectName: string;
  awsRegion: string;
  costOptimization: CostOptimizationConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
}

export interface CostOptimizationConfig {
  useFreeTier: boolean;
  enableAutoScaling: boolean;
  enableLifecyclePolicies: boolean;
  enableTTL: boolean;
  maxRetentionDays: number;
}

export interface MonitoringConfig {
  enableCloudWatch: boolean;
  enableLogging: boolean;
  enableMetrics: boolean;
  enableAlarms: boolean;
  logRetentionDays: number;
}

export interface SecurityConfig {
  enableEncryption: boolean;
  enableIAM: boolean;
  enableVPC: boolean;
  enableWAF: boolean;
  enableBackup: boolean;
}

export interface PerformanceConfig {
  enableCaching: boolean;
  enableCDN: boolean;
  enableCompression: boolean;
  enableConnectionPooling: boolean;
  maxConcurrency: number;
}

export const sharedConfig: SharedConfig = {
  projectName: 'SoundBite',
  awsRegion: 'us-east-1',
  
  costOptimization: {
    useFreeTier: true,
    enableAutoScaling: false, // Keep within Free Tier limits
    enableLifecyclePolicies: true,
    enableTTL: true,
    maxRetentionDays: 90,
  },
  
  monitoring: {
    enableCloudWatch: true,
    enableLogging: true,
    enableMetrics: true,
    enableAlarms: true,
    logRetentionDays: 7, // Free Tier limit
  },
  
  security: {
    enableEncryption: true,
    enableIAM: true,
    enableVPC: false, // Keep simple for Free Tier
    enableWAF: false, // Keep simple for Free Tier
    enableBackup: false, // Keep simple for Free Tier
  },
  
  performance: {
    enableCaching: false, // Keep simple for Free Tier
    enableCDN: false, // Keep simple for Free Tier
    enableCompression: true,
    enableConnectionPooling: false, // Keep simple for Free Tier
    maxConcurrency: 10, // Keep within Free Tier limits
  },
};

export const getSharedConfig = (): SharedConfig => sharedConfig;

export const getCostOptimizationConfig = () => sharedConfig.costOptimization;
export const getMonitoringConfig = () => sharedConfig.monitoring;
export const getSecurityConfig = () => sharedConfig.security;
export const getPerformanceConfig = () => sharedConfig.performance;
