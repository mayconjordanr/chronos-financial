// Test setup file for Jest
// This file is run before each test suite

import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/chronos_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Global test configuration
jest.setTimeout(10000);

// Mock console methods in test environment to reduce noise
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Export common test utilities
export const mockTenantId = 'test_tenant_123';
export const mockUserId = 'test_user_123';
export const mockAccountId = 'test_account_123';

export const createMockPrismaClient = () => ({
  account: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  user: {
    findFirst: jest.fn()
  },
  balanceHistory: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  $transaction: jest.fn()
});