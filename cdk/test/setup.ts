// Test setup for CDK testing
// Note: configureAws is not available in the current version
// We'll handle AWS configuration in integration tests separately

// Global test timeout for integration tests
jest.setTimeout(300000); // 5 minutes for integration tests

// Suppress console output during tests
// eslint-disable-next-line no-console
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  // eslint-disable-next-line no-console
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // eslint-disable-next-line no-console
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});
