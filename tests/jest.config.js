/** @type {import('jest').Config} */
module.exports = {
  // Basic configuration
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    '../backend/src/**/*.ts',
    '../prisma/**/*.ts',
    '!../backend/src/**/*.d.ts',
    '!../backend/src/types/**/*.ts',
    '!../node_modules/**',
    '!../dist/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Test setup
  setupFilesAfterEnv: ['<rootDir>/utils/test-setup.ts'],
  testTimeout: 30000,

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/../backend/src/$1',
    '^@prisma/(.*)$': '<rootDir>/../prisma/$1',
    '^@tests/(.*)$': '<rootDir>/$1'
  },

  // Test categorization
  projects: [
    {
      displayName: 'Infrastructure Tests',
      testMatch: ['<rootDir>/infrastructure/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/utils/test-setup.ts']
    },
    {
      displayName: 'Integration Tests',
      testMatch: ['<rootDir>/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/utils/test-setup.ts']
    },
    {
      displayName: 'E2E Tests',
      testMatch: ['<rootDir>/e2e/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/utils/test-setup.ts'],
      testTimeout: 60000
    },
    {
      displayName: 'Security Tests',
      testMatch: ['<rootDir>/security/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/utils/test-setup.ts']
    }
  ],

  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: 'coverage/html-report',
      filename: 'report.html',
      expand: true
    }],
    ['jest-junit', {
      outputDirectory: 'coverage',
      outputName: 'junit.xml'
    }]
  ],

  // Performance and debugging
  maxWorkers: '50%',
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,

  // Global variables for tests
  globals: {
    'ts-jest': {
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020',
          lib: ['es2020'],
          allowJs: true,
          skipLibCheck: true,
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          strict: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: 'node',
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true
        }
      }
    }
  }
};