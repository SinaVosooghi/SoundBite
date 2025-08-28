// Export all configuration modules
export * from './environments';
export * from './shared-config';

// Re-export commonly used types and functions
export {
  EnvironmentConfig,
  environments,
  getEnvironmentConfig,
  getAllEnvironments,
  getEnvironmentByPort,
  getEnvironmentByPrefix,
} from './environments';

export {
  SharedConfig,
  sharedConfig,
  getSharedConfig,
  getCostOptimizationConfig,
  getMonitoringConfig,
  getSecurityConfig,
  getPerformanceConfig,
} from './shared-config';

// Import the actual values for the default export
import { environments } from './environments';
import { sharedConfig } from './shared-config';

// Default export for easy importing
export const config = {
  environments,
  shared: sharedConfig,
};
