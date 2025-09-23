import { describe, beforeAll, beforeEach, afterAll, afterEach, it, expect, jest } from '@jest/globals';
import { PrismaClient, AccountType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AccountService, CreateAccountData } from './accounts.service';

// Mock Prisma Client
const mockPrisma = {
  account: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  user: {
    findFirst: jest.fn()
  },
  $transaction: jest.fn()
} as any;

describe('Account Tenant Isolation Security Tests', () => {
  let accountService: AccountService;

  // Test data for different tenants
  const tenant1Id = 'tenant_001';
  const tenant2Id = 'tenant_002';
  const user1Id = 'user_001';
  const user2Id = 'user_002';
  const account1Id = 'account_001';
  const account2Id = 'account_002';

  beforeAll(() => {
    accountService = new AccountService(mockPrisma as PrismaClient);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Cross-Tenant Account Access Prevention', () => {
    it('should prevent user from tenant1 accessing accounts from tenant2', async () => {
      // Mock account exists in tenant2
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const result = await accountService.getAccount(account2Id, user1Id, tenant1Id);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found or access denied');

      // Verify query includes correct tenant isolation
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: account2Id,
          tenantId: tenant1Id, // User's tenant, not account's tenant
          userId: user1Id
        }
      });
    });

    it('should prevent user from accessing accounts via direct ID manipulation', async () => {
      // Simulate trying to access account with direct ID but wrong tenant
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const result = await accountService.getAccount(account1Id, user1Id, tenant2Id);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found or access denied');

      // Ensure tenantId is always included in query
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: account1Id,
          tenantId: tenant2Id,
          userId: user1Id
        }
      });
    });

    it('should prevent cross-tenant account updates', async () => {
      // Mock no account found when querying with wrong tenant
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const updateData = {
        name: 'Hacked Account Name'
      };

      const result = await accountService.updateAccount(account1Id, updateData, user1Id, tenant2Id);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found or access denied');
      expect(mockPrisma.account.update).not.toHaveBeenCalled();

      // Verify tenant isolation in query
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: account1Id,
          tenantId: tenant2Id,
          userId: user1Id
        }
      });
    });

    it('should prevent cross-tenant account deletion', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const result = await accountService.deleteAccount(account1Id, user1Id, tenant2Id);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found or access denied');
      expect(mockPrisma.account.update).not.toHaveBeenCalled();

      // Verify tenant validation
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: account1Id,
          tenantId: tenant2Id,
          userId: user1Id
        }
      });
    });

    it('should prevent cross-tenant balance updates', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          account: {
            findFirst: jest.fn().mockResolvedValue(null) // No account found in wrong tenant
          }
        };
        return await callback(mockTx);
      });

      const result = await accountService.updateBalance(
        account1Id,
        new Decimal('1000.00'),
        user1Id,
        tenant2Id
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found or access denied');
    });
  });

  describe('Account Listing by Tenant', () => {
    it('should only return accounts from users tenant', async () => {
      const tenant1Accounts = [
        {
          id: 'account_t1_1',
          tenantId: tenant1Id,
          userId: user1Id,
          name: 'Tenant 1 Account 1',
          type: AccountType.CHECKING,
          balance: new Decimal('1000.00')
        },
        {
          id: 'account_t1_2',
          tenantId: tenant1Id,
          userId: user1Id,
          name: 'Tenant 1 Account 2',
          type: AccountType.SAVINGS,
          balance: new Decimal('5000.00')
        }
      ];

      mockPrisma.account.findMany.mockResolvedValue(tenant1Accounts);

      const result = await accountService.getAccounts(user1Id, tenant1Id);

      expect(result.success).toBe(true);
      expect(result.accounts).toEqual(tenant1Accounts);

      // Verify query includes tenant isolation
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: tenant1Id,
          userId: user1Id
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Verify no accounts from other tenants are returned
      expect(result.accounts?.every(account => account.tenantId === tenant1Id)).toBe(true);
    });

    it('should return empty array when user has no accounts in their tenant', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);

      const result = await accountService.getAccounts(user1Id, tenant1Id);

      expect(result.success).toBe(true);
      expect(result.accounts).toEqual([]);

      // Verify correct tenant queried
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: tenant1Id,
          userId: user1Id
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });

    it('should not leak accounts between tenants in filtered queries', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);

      const filters = {
        type: AccountType.CHECKING
      };

      await accountService.getAccounts(user1Id, tenant1Id, filters);

      // Verify tenant isolation is maintained with filters
      expect(mockPrisma.account.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: tenant1Id,
          userId: user1Id,
          type: AccountType.CHECKING
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });
  });

  describe('Account Updates Across Tenant Boundaries', () => {
    it('should prevent updating account from different tenant even with valid account ID', async () => {
      // Simulate account exists but in different tenant
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const updateData = {
        name: 'Updated Name',
        description: 'Updated Description'
      };

      const result = await accountService.updateAccount(account1Id, updateData, user1Id, tenant2Id);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found or access denied');
      expect(mockPrisma.account.update).not.toHaveBeenCalled();
    });

    it('should prevent balance history access across tenants', async () => {
      mockPrisma.balanceHistory = {
        findMany: jest.fn().mockResolvedValue([])
      };

      const result = await accountService.getBalanceHistory(account1Id, user1Id, tenant2Id);

      // Verify tenant isolation in balance history query
      expect(mockPrisma.balanceHistory.findMany).toHaveBeenCalledWith({
        where: {
          accountId: account1Id,
          tenantId: tenant2Id, // User's tenant
          account: {
            userId: user1Id
          }
        },
        orderBy: {
          timestamp: 'desc'
        }
      });
    });
  });

  describe('Account Deletion Isolation', () => {
    it('should prevent deleting accounts from different tenant', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const result = await accountService.deleteAccount(account1Id, user1Id, tenant2Id);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Account not found or access denied');
      expect(mockPrisma.account.update).not.toHaveBeenCalled();
    });

    it('should only allow deletion of accounts within users tenant', async () => {
      const accountInCorrectTenant = {
        id: account1Id,
        tenantId: tenant1Id,
        userId: user1Id,
        balance: new Decimal('0')
      };

      mockPrisma.account.findFirst.mockResolvedValue(accountInCorrectTenant);
      mockPrisma.account.update.mockResolvedValue({
        ...accountInCorrectTenant,
        isActive: false
      });

      const result = await accountService.deleteAccount(account1Id, user1Id, tenant1Id);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Account deleted successfully');

      // Verify correct tenant validation
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: account1Id,
          tenantId: tenant1Id,
          userId: user1Id
        }
      });
    });
  });

  describe('Account Creation with Tenant Context', () => {
    it('should always create accounts with correct tenant ID', async () => {
      const accountData: CreateAccountData = {
        name: 'New Account',
        type: AccountType.CHECKING,
        balance: new Decimal('500.00')
      };

      // Mock user validation
      mockPrisma.user.findFirst.mockResolvedValue({
        id: user1Id,
        tenantId: tenant1Id,
        isActive: true
      });

      // Mock account creation
      mockPrisma.account.create.mockResolvedValue({
        id: 'new_account_id',
        tenantId: tenant1Id,
        userId: user1Id,
        ...accountData
      });

      const result = await accountService.createAccount(accountData, user1Id, tenant1Id);

      expect(result.success).toBe(true);

      // Verify account created with correct tenant ID
      expect(mockPrisma.account.create).toHaveBeenCalledWith({
        data: {
          tenantId: tenant1Id, // CRITICAL: Must match user's tenant
          userId: user1Id,
          name: 'New Account',
          type: AccountType.CHECKING,
          balance: new Decimal('500.00'),
          currency: 'USD',
          isActive: true
        }
      });
    });

    it('should reject account creation for users not in the specified tenant', async () => {
      const accountData: CreateAccountData = {
        name: 'Malicious Account',
        type: AccountType.CHECKING
      };

      // Mock user not found in specified tenant
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await accountService.createAccount(accountData, user1Id, tenant2Id);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found in this tenant');
      expect(mockPrisma.account.create).not.toHaveBeenCalled();

      // Verify user validation includes tenant check
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: user1Id,
          tenantId: tenant2Id,
          isActive: true
        }
      });
    });
  });

  describe('Database Query Validation', () => {
    it('should never execute queries without tenant context', async () => {
      // Test that all database queries include tenantId
      const spyOnFindFirst = jest.spyOn(mockPrisma.account, 'findFirst');
      const spyOnFindMany = jest.spyOn(mockPrisma.account, 'findMany');

      mockPrisma.account.findFirst.mockResolvedValue(null);
      mockPrisma.account.findMany.mockResolvedValue([]);

      // Execute various service methods
      await accountService.getAccount(account1Id, user1Id, tenant1Id);
      await accountService.getAccounts(user1Id, tenant1Id);

      // Verify all calls include tenantId
      spyOnFindFirst.mock.calls.forEach(call => {
        const whereClause = call[0]?.where;
        expect(whereClause).toHaveProperty('tenantId');
        expect(whereClause.tenantId).toBe(tenant1Id);
      });

      spyOnFindMany.mock.calls.forEach(call => {
        const whereClause = call[0]?.where;
        expect(whereClause).toHaveProperty('tenantId');
        expect(whereClause.tenantId).toBe(tenant1Id);
      });
    });

    it('should validate that update operations include tenant context', async () => {
      const mockAccount = {
        id: account1Id,
        tenantId: tenant1Id,
        userId: user1Id,
        balance: new Decimal('0')
      };

      mockPrisma.account.findFirst.mockResolvedValue(mockAccount);
      mockPrisma.account.update.mockResolvedValue({
        ...mockAccount,
        name: 'Updated Name'
      });

      const updateData = { name: 'Updated Name' };
      await accountService.updateAccount(account1Id, updateData, user1Id, tenant1Id);

      // Verify findFirst (validation) includes tenant context
      expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          id: account1Id,
          tenantId: tenant1Id,
          userId: user1Id
        }
      });
    });
  });

  describe('Race Condition and Concurrent Access Prevention', () => {
    it('should prevent concurrent cross-tenant access attempts', async () => {
      // Simulate concurrent requests from different tenants
      mockPrisma.account.findFirst
        .mockResolvedValueOnce(null) // First call from tenant2 - should fail
        .mockResolvedValueOnce({ // Second call from tenant1 - should succeed
          id: account1Id,
          tenantId: tenant1Id,
          userId: user1Id
        });

      const concurrentRequests = [
        accountService.getAccount(account1Id, user1Id, tenant2Id), // Wrong tenant
        accountService.getAccount(account1Id, user1Id, tenant1Id)  // Correct tenant
      ];

      const results = await Promise.all(concurrentRequests);

      expect(results[0].success).toBe(false); // Wrong tenant should fail
      expect(results[0].message).toBe('Account not found or access denied');
      expect(results[1].success).toBe(true);  // Correct tenant should succeed

      // Verify both calls included tenant context
      expect(mockPrisma.account.findFirst).toHaveBeenNthCalledWith(1, {
        where: {
          id: account1Id,
          tenantId: tenant2Id,
          userId: user1Id
        }
      });

      expect(mockPrisma.account.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          id: account1Id,
          tenantId: tenant1Id,
          userId: user1Id
        }
      });
    });
  });

  describe('Audit Trail and Security Logging', () => {
    it('should maintain tenant context in error messages without exposing sensitive data', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      const result = await accountService.getAccount(account1Id, user1Id, tenant2Id);

      expect(result.success).toBe(false);
      // Error message should not reveal that account exists in different tenant
      expect(result.message).toBe('Account not found or access denied');
      // Message should not contain actual tenant IDs or other sensitive info
      expect(result.message).not.toContain(tenant1Id);
      expect(result.message).not.toContain(tenant2Id);
      expect(result.message).not.toContain(account1Id);
    });
  });
});