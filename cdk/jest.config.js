module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
    '!lib/**/*.interface.ts',
    '!lib/**/*.types.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 30000, // 30 seconds for unit tests
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  forceExit: true,
}; 