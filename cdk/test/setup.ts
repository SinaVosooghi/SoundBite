// Test setup for CDK testing
// Note: configureAws is not available in the current version
// We'll handle AWS configuration in integration tests separately

// Global test timeout for integration tests
jest.setTimeout(300000); // 5 minutes for integration tests

// Suppress console output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
}); 