/** @type {import('jest').Config} */
module.exports = {
  // In this sandbox NODE_ENV='production' even inside Jest workers, which prevents
  // react.development.js from exporting `act`. This setupFile forces NODE_ENV='test'
  // before the module registry populates so React.act is available for RNTL 14.
  setupFiles: ['<rootDir>/src/__tests__/set-node-env.js'],
  preset: 'jest-expo',
  // Don't override transformIgnorePatterns — jest-expo's preset already handles
  // .pnpm + react-native + expo. Overriding it was the root cause of the earlier
  // "Cannot use import statement outside a module" failure.
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: ['<rootDir>/src/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(png|jpg|jpeg|gif|svg|ttf|otf|woff|woff2)$':
      '<rootDir>/src/__tests__/__mocks__/fileMock.js',
  },
  collectCoverage: false,
};
