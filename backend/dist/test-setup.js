"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockPrismaClient = exports.mockAccountId = exports.mockUserId = exports.mockTenantId = void 0;
const globals_1 = require("@jest/globals");
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/chronos_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
globals_1.jest.setTimeout(10000);
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeAll(() => {
    console.error = globals_1.jest.fn();
    console.warn = globals_1.jest.fn();
});
afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
});
exports.mockTenantId = 'test_tenant_123';
exports.mockUserId = 'test_user_123';
exports.mockAccountId = 'test_account_123';
const createMockPrismaClient = () => ({
    account: {
        create: globals_1.jest.fn(),
        findMany: globals_1.jest.fn(),
        findFirst: globals_1.jest.fn(),
        update: globals_1.jest.fn(),
        delete: globals_1.jest.fn(),
        count: globals_1.jest.fn()
    },
    user: {
        findFirst: globals_1.jest.fn()
    },
    balanceHistory: {
        create: globals_1.jest.fn(),
        findMany: globals_1.jest.fn()
    },
    $transaction: globals_1.jest.fn()
});
exports.createMockPrismaClient = createMockPrismaClient;
//# sourceMappingURL=test-setup.js.map